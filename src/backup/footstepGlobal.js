let currentFootstepStopper = null;

export function setGlobalFootstepStopper(stopper) {
  if (currentFootstepStopper && typeof currentFootstepStopper === "function") {
    currentFootstepStopper();
  }
  currentFootstepStopper = stopper;
}