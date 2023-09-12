import {useLoaderData} from '@remix-run/react';
import {LoaderFunction} from '@shopify/remix-oxygen';
import {
  getProductsReviewInfo,
  getWishlist,
  getWishlistInfo,
} from '@sledge-app/api';
import {Widget, WidgetHeader} from '@sledge-app/react-wishlist';

export const loader: LoaderFunction = async ({context}) => {
  const sledgeSession = context.session.get('sledgeSession');
  const wishlists = await getWishlist(sledgeSession);
  const wishlistInfo = await getWishlistInfo(sledgeSession);
  const productIds = wishlists.data.map((v: any) => v.product.id);
  const reviews = await getProductsReviewInfo(sledgeSession, productIds);
  return {wishlists, wishlistInfo, reviews};
};

export default function Wishlist() {
  const data = useLoaderData();
  return (
    <Widget.Root
      data={data.wishlists}
      dataInfo={data.wishlistInfo}
      dataReviews={data.reviews}
    >
      <Widget.Header>
        <WidgetHeader.Title text="My Wishlist" />
        <WidgetHeader.SearchForm placeholder="Search product" />
        <WidgetHeader.ClearTrigger buttonText="Clear Wishlist" />
        <WidgetHeader.ShareTrigger buttonText="Share Wishlist" />
        <WidgetHeader.Sort />
        <WidgetHeader.Limit options={[10, 25, 50, 100]} />
      </Widget.Header>
      <Widget.List gridType="large" />
    </Widget.Root>
  );
}
