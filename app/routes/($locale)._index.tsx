import {defer, type LoaderArgs} from '@shopify/remix-oxygen';
import {
  Await,
  useLoaderData,
  Link,
  type V2_MetaFunction,
} from '@remix-run/react';
import {Suspense} from 'react';
import {Image, Money, parseGid} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {getProductsReviewInfo, wishlistCheck} from '@sledge-app/api';
import {Rating} from '@sledge-app/react-product-review';
import {Trigger} from '@sledge-app/react-wishlist';

export const meta: V2_MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader({request, context}: LoaderArgs) {
  const {storefront} = context;
  const {collections} = await storefront.query(FEATURED_COLLECTION_QUERY);
  const featuredCollection = collections.nodes[0];
  const recommendedProducts = storefront.query(RECOMMENDED_PRODUCTS_QUERY);

  const productIds = (await recommendedProducts).products.nodes.map(
    (v) => parseGid(v.id)?.id,
  );

  const sledgeSession = context.session.get('sledgeSession');
  const reviews = await getProductsReviewInfo(sledgeSession, productIds);

  const wishlists = await wishlistCheck(sledgeSession, productIds);

  return defer({featuredCollection, recommendedProducts, reviews, wishlists});
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="home">
      <FeaturedCollection collection={data.featuredCollection} />
      <RecommendedProducts products={data.recommendedProducts} />
    </div>
  );
}

function FeaturedCollection({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  const image = collection.image;
  return (
    <Link
      className="featured-collection"
      to={`/collections/${collection.handle}`}
    >
      {image && (
        <div className="featured-collection-image">
          <Image data={image} sizes="100vw" />
        </div>
      )}
      <h1>{collection.title}</h1>
    </Link>
  );
}

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery>;
}) {
  const data = useLoaderData();

  return (
    <div className="recommended-products">
      <h2>Recommended Products</h2>
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={products}>
          {({products}) => (
            <div className="recommended-products-grid">
              {products.nodes.map((product) => (
                <Link
                  key={product.id}
                  className="recommended-product relative"
                  to={`/products/${product.handle}`}
                >
                  <div className="absolute right-4 ">
                    <Trigger
                      params={{
                        productId: parseGid(product.id).id,
                        productVariantId: '',
                        productName: product.title,
                        productVendor: '',
                        productSku: '',
                        productVariantName: ``,
                        productLink: `https://dev-learn-apps.myshopify.com/products/${product.handle}`,
                        productImage: product.images.nodes[0].url,
                        productCurrency:
                          product.priceRange.minVariantPrice.currencyCode,
                        productPrice: product.priceRange.minVariantPrice.amount,
                      }}
                      wishlistChecked={data?.wishlists[parseGid(product.id).id]}
                    />
                  </div>
                  <Image
                    data={product.images.nodes[0]}
                    aspectRatio="1/1"
                    sizes="(min-width: 45em) 20vw, 50vw"
                  />
                  <Rating
                    size="sm"
                    params={{productId: parseGid(product.id).id}}
                    data={data.reviews[parseGid(product.id).id]}
                  />
                  <h4>{product.title}</h4>
                  <small>
                    <Money data={product.priceRange.minVariantPrice} />
                  </small>
                </Link>
              ))}
            </div>
          )}
        </Await>
      </Suspense>
      <br />
    </div>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 1) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
