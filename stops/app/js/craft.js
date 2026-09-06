// How to shoot each scene, as opposed to what to set.
//
// The engine answers the exposure question. This file answers the one a
// beginner actually asks next — "yes, but how do I take a good one?" — and it
// is deliberately the least clever file in the project: no derivation, no
// arithmetic, just what someone standing next to you would say.

export const CRAFT = {
  sports: {
    intro: 'Everything here is a race between the shutter and the light, and you will almost always want more of both than you have.',
    craft: [
      ['Stand where the play comes to you', 'Near a goal, a corner, the finish. Following from the halfway line gets you the backs of heads.'],
      ['Pre-focus, then wait', 'Half-press before the moment rather than during it. One focus point on the player beats a wide area that keeps grabbing the crowd.'],
      ['Shoot the face, not the ball', 'A sharp face mid-effort is a photograph. A sharp ball is a diagram.'],
    ],
    mistake: 'Shooting from the shade towards the sun. Put the light behind you or every face is a silhouette.',
  },
  kids: {
    intro: 'The problem is rarely the camera. It is that you are two feet too high and half a second too late.',
    craft: [
      ['Get down to their eye level', 'Kneel, sit, lie on the floor. It matters more than any of these numbers.'],
      ['Give them something to do', 'A posed child is a stiff child. Hand them something and photograph what happens next.'],
      ['One focus point, on the near eye', 'And keep shooting. Frames are free.'],
    ],
    mistake: 'Waiting for a smile. The second before and the second after are usually the better picture.',
  },
  wildlife: {
    intro: 'Fieldcraft beats focal length. The best lens in the world will not help you if the bird has already gone.',
    craft: [
      ['Approach slowly, never straight on', 'Move at an angle and stop often. Animals read a direct line as a threat.'],
      ['Focus on the eye, always', 'A sharp eye carries a soft wingtip. The reverse never works.'],
      ['Check the background before the subject', 'One step to the left can turn a cluttered hedge into clean green.'],
    ],
    mistake: 'Filling the frame. Leave space in the direction the animal is looking or moving.',
  },
  portrait: {
    intro: 'The settings are the easy half. The hard half is a person who knows there is a camera pointed at them.',
    craft: [
      ['Find soft light, or move to it', 'Open shade, a north window, an overcast sky. Direct sun gives you squints and hard shadows.'],
      ['Focus on the near eye', 'Wide open, the far eye may already be soft. That is fine. The near one must not be.'],
      ['Talk, and keep shooting', 'The frame just after they laugh at their own answer is usually the one.'],
    ],
    mistake: 'Standing close with a wide lens. Step back and zoom in instead — noses will thank you.',
  },
  group: {
    intro: 'Depth of field is the whole problem here: everyone has to be sharp, and everyone has to be looking.',
    craft: [
      ['Two rows, not three', 'Stagger them, and bring the back row a step closer than feels natural.'],
      ['Focus a third of the way in', 'Not the front row. Depth of field reaches further behind the focus point than in front of it.'],
      ['Take more frames than you think', 'Somebody always blinks. Five in a row, without announcing it.'],
    ],
    mistake: 'Shooting wide open. f/5.6 and f/8 exist for exactly this situation.',
  },
  landscape: {
    intro: 'The light does most of the work, so most of the skill is in deciding when to turn up.',
    craft: [
      ['Focus a third of the way into the scene', 'Not the horizon. It is the hyperfocal distance in everything but name.'],
      ['Give the eye a way in', 'A path, a wall, a stream. Scenery without a foreground is a postcard.'],
      ['Use the tripod even when you could hand-hold', 'It slows you down, and slowing down is the point.'],
    ],
    mistake: 'Shooting at midday. The hour after sunrise and the hour before sunset are not a cliché, they are the job.',
  },
  architecture: {
    intro: 'Buildings do not move, so all of this is about lines, and about where you choose to stand.',
    craft: [
      ['Keep the back of the camera parallel to the wall', 'Tilt up and the verticals lean. Step back and crop instead.'],
      ['Stand further away and zoom in', 'It flattens the distortion that a wide lens exaggerates.'],
      ['Wait for light to rake across the surface', 'Flat frontal light kills texture. Low side light finds it.'],
    ],
    mistake: 'Shooting from the front door. Corners and odd angles say more than the postcard view.',
  },
  street: {
    intro: 'The technical part is trivial. The hard part is being close enough, and not flinching.',
    craft: [
      ['Zone focus and stop waiting', 'f/8, focused at three metres. Everything from about two to six is sharp, and autofocus never delays you again.'],
      ['Find a background, then wait for a subject', 'Good light on an interesting wall, and patience. Far easier than chasing.'],
      ['Get closer than feels polite', 'Then one step closer. Most street pictures fail from timidity, not technique.'],
    ],
    mistake: 'Shooting from the hip to avoid being noticed. Look through the camera — people mind far less than you expect.',
  },
  indoor: {
    intro: 'You are always short of light indoors, and the answer is usually to move rather than to change a setting.',
    craft: [
      ['Turn the subject towards the window', 'One good light beats three bad ones. Switch the ceiling light off if it is fighting.'],
      ['Get closer to the light', 'Halving the distance to a window is two stops. No ISO setting is that generous.'],
      ['Brace yourself properly', 'Elbows in, back against a wall, breathe out as you press. Worth a stop on its own.'],
    ],
    mistake: 'Mixing daylight and lamplight in one frame. White balance can only please one of them.',
  },
  concert: {
    intro: 'Hard light, black surroundings, and a subject who will not hold still for you.',
    craft: [
      ['Meter the face, not the room', 'Spot metering, or the darkness around the stage will fool the camera into overexposing.'],
      ['Shoot on the beat', 'Performers pause at the end of a phrase. That pause is your frame.'],
      ['Let the background go black', 'It is a feature of the scene, not a fault to fix with ISO.'],
    ],
    mistake: 'Using flash. It flattens the stage lighting, annoys everyone, and usually does not reach anyway.',
  },
  food: {
    intro: 'Food photography is a lighting exercise wearing a chef’s hat.',
    craft: [
      ['Shoot towards the window', 'Back light and side light give food shape. Light from behind you flattens it.'],
      ['Pick one thing to be sharp', 'The front edge of the plate, or the fork. Everything else may go soft.'],
      ['Set up first, plate last', 'Hot food has about four minutes in it. Frame and focus on an empty plate.'],
    ],
    mistake: 'Shooting from directly above out of habit. Try the angle you would actually see it from while eating.',
  },
  macro: {
    intro: 'At this distance depth of field is measured in millimetres, and every breath you take is camera shake.',
    craft: [
      ['Focus by rocking, not by turning', 'Set the focus roughly, then move your whole body a few millimetres forward and back.'],
      ['Block the wind or wait it out', 'A flower moving a millimetre ruins the frame. A piece of card as a windbreak is enough.'],
      ['Stop down further than feels right', 'f/11 sounds dark. At this magnification it is barely enough.'],
    ],
    mistake: 'Chasing more magnification. A slightly wider frame that is genuinely sharp beats a closer one that is not.',
  },
  nightcity: {
    intro: 'The camera sees far more at night than your eye does. Give it time and it will show you.',
    craft: [
      ['Use the self-timer', 'Pressing the shutter shakes a tripod. Two seconds of delay fixes it for nothing.'],
      ['Shoot the blue hour, not black night', 'Twenty minutes after sunset the sky still has colour and the lights are already on. That window is the whole game.'],
      ['Stop down for starbursts', 'f/11 and beyond turns every streetlight into a star. The one time diffraction is a feature.'],
    ],
    mistake: 'Trusting the meter. A night scene is meant to look dark, and the camera will try to make it grey.',
  },
  stars: {
    intro: 'All of this is about how long you can hold the shutter open before the earth turns far enough to smear the stars.',
    craft: [
      ['Focus manually on a bright star', 'Live view, magnified as far as it goes, and turn until the point is at its smallest. Autofocus cannot do this.'],
      ['Check the moon before you drive anywhere', 'A full moon is as bad as a streetlight. New moon and no town is the difference between a photograph and a grey wash.'],
      ['Put something in the foreground', 'A tree, a ridge, a building. Stars on their own have no scale.'],
    ],
    mistake: 'Pointing straight up. Include the horizon and the picture has somewhere to stand.',
  },
  water: {
    intro: 'A long exposure is not the goal. A particular look is the goal, and the exposure is only how you reach it.',
    craft: [
      ['A second is often enough', 'Thirty seconds makes fog. One or two keeps the shape of the water while smoothing it.'],
      ['A polariser is also a two-stop ND', 'And it kills the glare coming off wet rock at the same time.'],
      ['Watch the sky as well as the water', 'A long exposure smears cloud too. That either makes the picture or ruins it.'],
    ],
    mistake: 'Forgetting that the tripod is standing on soft ground. Long exposures find every millimetre of settle.',
  },
  panning: {
    intro: 'The technique is a golf swing. It is the follow-through that makes it work.',
    craft: [
      ['Track before, during and after', 'Start following early, press without stopping, and keep turning after the shutter has closed.'],
      ['Turn from the hips', 'Feet planted, upper body rotating. Arms alone wobble.'],
      ['Expect to keep one in ten', 'This is a numbers game even for people who are good at it.'],
    ],
    mistake: 'Going too slow too soon. Start around 1/125 and work downwards only once you are getting keepers.',
  },
  fireworks: {
    intro: 'You are not exposing for a burst. You are choosing how many bursts land on one frame.',
    craft: [
      ['Focus manually at infinity before it starts', 'Once it is dark and the sky is busy, autofocus has nothing to hold on to.'],
      ['Frame wider than feels right', 'They go higher than you expect, and cropping afterwards costs nothing.'],
      ['Cover the lens between bursts', 'A black card held over the front during a long exposure lets you stack two or three bursts into one frame.'],
    ],
    mistake: 'Chasing the bursts around the sky. Set the frame, leave it alone, and let them happen inside it.',
  },
  moon: {
    intro: 'The moon is a sunlit rock a quarter of a million miles away. Expose it as daylight and it works.',
    craft: [
      ['Ignore the darkness around it', 'The night sky is irrelevant. Meter the moon itself or it blows out to a white disc.'],
      ['Use the longest lens you have, then crop', '300 mm still gives a small moon. That is normal.'],
      ['Shoot it low, next to something', 'A moon beside a building or a ridge has scale. A moon alone in black is a circle.'],
    ],
    mistake: 'Trying to get the moon and a lit landscape in one frame. They are about ten stops apart — take two.',
  },
};

export const craftFor = (id) => CRAFT[id] ?? null;
