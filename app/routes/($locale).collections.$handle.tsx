import {json, redirect, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData, Link, type V2_MetaFunction} from '@remix-run/react';
import {getPaginationVariables, parseGid} from '@shopify/hydrogen';
import {ProductFilterWidget} from '@sledge-app/react-instant-search';
import {getResult, getSledgeSettings} from '@sledge-app/api';

export const meta: V2_MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data.collection?.title || 'All'} Collection`}];
};

export async function loader({request, params, context}: LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  if (!handle) {
    return redirect('/collections');
  }

  const {collection} = await storefront.query(COLLECTION_QUERY, {
    variables: {handle, ...paginationVariables},
  });

  if (!collection && handle !== 'all') {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  const paramsString = new URL(request.url).searchParams.toString();
  const searchParams = new URLSearchParams(paramsString);

  let sledgeSession = context.session.get('sledgeSession');
  const sledgeSettings = await getSledgeSettings(sledgeSession);

  const data = await getResult(
    sledgeSession,
    sledgeSettings,
    context.env.SLEDGE_INSTANT_SEARCH_API_KEY || '',
    searchParams,
    searchParams.get('q') || '',
    parseGid(collection?.id).id,
    'product-filter',
  );
  return json({collection, data});
}

export default function Collection() {
  const data = useLoaderData<typeof loader>();

  return (
    <ProductFilterWidget
      data={data.data}
      query={{keyword: 'q'}}
      params={{collectionId: data.collection?.id}}
      onAfterAddToCart={() => {}}
      onAfterAddWishlist={() => {}}
      onAfterRemoveWishlist={() => {}}
      onAfterRenderProduct={() => {}}
    />
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
    variants(first: 1) {
      nodes {
        selectedOptions {
          name
          value
        }
      }
    }
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
` as const;
