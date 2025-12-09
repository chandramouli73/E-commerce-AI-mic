import '@shopify/ui-extensions/preact';
import {render} from 'preact';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  return (
    <s-stack direction="block">
      <s-image src="https://cdn.shopify.com/s/files/1/0775/7234/2014/files/Designer_1_-Copy-Copy.png?v=1762750068" />
      <s-stack>
        <s-heading>Heading</s-heading>
        <s-text type="small">Description</s-text>
      </s-stack>
      <s-button
  onClick={() => {
    console.log('button was pressed');
  }}
>
  Click me
</s-button>


    </s-stack>
  );
}