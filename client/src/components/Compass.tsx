import type { ComponentProps } from "react";
import CompassStable from "./CompassStable";

export type CompassProps = ComponentProps<typeof CompassStable>;

/**
 * Temporary wrapper that re-exports the stable Compass implementation.
 *
 * The original experimental Compass component still exists in version control,
 * but it contained a large amount of commented code that no longer compiled.
 * Keeping this thin wrapper ensures any imports of the legacy component keep
 * working while the stable version provides the production experience.
 */
export function Compass(props: CompassProps) {
  return <CompassStable {...props} />;
}

export default Compass;
