# R33H — Fish catch side-orientation fix

Status: CANDIDATE
Base: R33G candidate (R33D remains the latest locked fishing baseline)

## Scope

One isolated catch-presentation correction:

- keep the fish vertically hung in the approved R33F/R33G hero composition;
- rotate the result wrapper around world Y without the erroneous +90 degree offset;
- present the fish's true side profile to the active catch camera rather than its dorsal/belly face.

## Explicitly unchanged

- hooked-fish visibility/fight motion from R33G;
- catch/result card and camera composition;
- R33D olive FishButton;
- cast distance, charge loop, reel/tension logic, fish pool, Catch Log and Sigurd;
- Boat -> Waterfall navigation;
- world movement/camera, Stable, riding, Jumping, MoveIn and vegetation.
