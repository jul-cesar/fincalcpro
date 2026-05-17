declare module "react-katex" {
  import type { ComponentType, ReactNode } from "react";

  type MathProps = {
    children?: ReactNode;
    math?: string;
    errorColor?: string;
    renderError?: (error: Error) => ReactNode;
  };

  export const BlockMath: ComponentType<MathProps>;
  export const InlineMath: ComponentType<MathProps>;
}
