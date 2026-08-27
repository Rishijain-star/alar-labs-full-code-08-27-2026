import React, { forwardRef } from "react";
import PropTypes from "prop-types";
import { NavLink as RouterNavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const NavLink = forwardRef(function NavLink(
  { className, activeClassName, pendingClassName, to, ...props },
  ref
) {
  return (
    <RouterNavLink
      ref={ref}
      to={to}
      className={({ isActive, isPending }) =>
        cn(className, isActive && activeClassName, isPending && pendingClassName)
      }
      {...props}
    />
  );
});

NavLink.displayName = "NavLink";

NavLink.propTypes = {
  to: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ]).isRequired,
  className: PropTypes.string,
  activeClassName: PropTypes.string,
  pendingClassName: PropTypes.string,
};

export { NavLink };
