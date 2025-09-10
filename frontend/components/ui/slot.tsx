import * as React from "react";

/**
 * A minimal Slot implementation used to compose components.
 * It clones the child element and merges className and other props.
 */
export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

export const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, ...props }, ref) =>
    React.isValidElement(children)
      ? React.cloneElement(
          children as React.ReactElement,
          {
            ...(props as any),
            ref,
            className: [children.props.className, props.className]
              .filter(Boolean)
              .join(" "),
          }
        )
      : React.createElement("span", { ...props, ref }, children)
);

Slot.displayName = "Slot";

