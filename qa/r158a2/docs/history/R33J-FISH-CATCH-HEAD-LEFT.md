# R33J — Fish Catch Head-Left Yaw Fix

Status: CANDIDATE
Base: R33I candidate. R33D remains the latest locked fishing baseline until runtime approval.

## Scope

One isolated result-presentation correction:

- preserve the approved catch fish pose with belly down and back up;
- rotate only the result wrapper yaw 90 degrees camera-left;
- fish head points left, tail right, with the side profile facing the camera.

## Explicitly unchanged

- catch/result camera and result card;
- R33G hooked-fish fight visibility/motion;
- R33D olive FishButton;
- cast distance, charge loop, reel/tension, Sigurd, Catch Log and fish pool;
- Boat -> Waterfall navigation;
- SharedLandscape, movement, normal camera, Stable/riding/Jumping/MoveIn and vegetation.
