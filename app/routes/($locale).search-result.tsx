import {useLoaderData} from '@remix-run/react';
import {LoaderFunction} from '@shopify/remix-oxygen';
import {getResult, getSledgeSettings} from '@sledge-app/api';
import {SearchResultWidget} from '@sledge-app/react-instant-search';

export const loader: LoaderFunction = async ({context, request}) => {
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
  );

  return {
    ...data,
  };
};

export default function SearchResult() {
  const data = useLoaderData();

  return (
    <SearchResultWidget
      query={{keyword: 'q'}}
      data={data}
      onAfterAddToCart={() => {}}
      onAfterAddWishlist={() => {}}
      onAfterRemoveWishlist={() => {}}
      onAfterRenderProduct={() => {}}
    />
  );
}
