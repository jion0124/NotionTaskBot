import { SelectHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Props = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, Props>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={clsx(
      "border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 transition",
      className
    )}
    {...props}
  />
));
Select.displayName = "Select";
export default Select; 