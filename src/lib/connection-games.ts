/** One weekly-marquee connection quiz. */
export interface ThemeConnectionGame {
  /** The definitive explanation of the secret link, shown after answering. */
  connection: string;
  /** Exactly 4 choices. Shuffled for display; see connection-options.ts. */
  options: string[];
  /** Index into `options`. Always 0 by authoring convention — see rule 3. */
  correctIndex: number;
  /** A real craft or history note, shown alongside the reveal. */
  triviaNote?: string;
}

/**
 * The weekly-marquee connection quiz, one entry per theme slug.
 *
 * Kept out of shortlist-themes.ts on purpose: that file answers "which films",
 * this one answers "what is the puzzle". They change for different reasons and
 * neither reads well interleaved with the other.
 *
 * AUTHORING RULES — the first one is the whole game
 *
 * 1. ALL FOUR OPTIONS MUST BE CLAIMS OF THE SAME KIND. The original five
 *    quizzes shipped with a structural tell: the answer was the only option
 *    describing a pattern in the films, while the three distractors were
 *    production trivia ("won a BAFTA", "shot chronologically", "the directors
 *    cameoed"). A player could win every week without having seen anything,
 *    just by picking the one that sounded like a theme. Distractors must be
 *    statements about the films themselves, so the only way to eliminate one
 *    is to actually think about the roster.
 *
 * 2. Every distractor must be FALSE for this specific roster, and false for a
 *    reason a viewer could name. "All six are set in the same decade" is a good
 *    distractor when two of them plainly are not. Check it against the films.
 *
 * 3. `options[0]` is always the answer. Display order is shuffled per theme at
 *    render time (see connection-options.ts), so a fixed authoring slot costs
 *    nothing and lets a reviewer read down the file and check every answer.
 *
 * 4. Never name a contained film in an option. The curation rules in
 *    shortlist-themes.ts forbid spoiling the roster, and naming one hands over
 *    a sixth of the puzzle.
 *
 * 5. `triviaNote` is read after answering. Teach something real — a craft fact
 *    or a piece of film history. Do not invent specifics; if a claim cannot be
 *    stated confidently, make the general observation instead.
 */
export const CONNECTION_GAMES: Record<string, ThemeConnectionGame> = {
  "secretly-same-story": {
    connection:
      "The Hero's Journey. Across wildly different genres, each film walks Joseph Campbell's monomyth: an ordinary world, a call refused, a mentor, a threshold, an ordeal, and a return carrying something the hero did not leave with.",
    options: [
      "Every film walks the same ancient mythic story structure, beat for beat",
      "Every protagonist is an orphan being raised by someone other than a parent",
      "All six began as published novels long before they were ever screenplays",
      "Each story is told out of order, assembling itself only in the final act",
    ],
    correctIndex: 0,
    triviaNote:
      "George Lucas credited Campbell's 'The Hero with a Thousand Faces' as a direct structural guide while writing Star Wars. The two men later met, and the book's influence on blockbuster screenwriting has been traceable ever since.",
  },

  "best-hairpieces": {
    connection:
      "Transformative practical makeup. Every film hides a recognisable performer under prosthetics, latex, or a wig substantial enough that the face on screen is not the face on the call sheet.",
    options: [
      "Every film buries a recognisable actor under prosthetics, latex or heavy wigs",
      "Each lead performance was captured with motion tracking rather than makeup",
      "All six are set in a decade at least thirty years before they were filmed",
      "Every transformation is explained inside the story as a deliberate disguise",
    ],
    correctIndex: 0,
    triviaNote:
      "Makeup was the first craft category the Academy added after decades of lobbying, largely because voters kept confusing prosthetic work with casting. The award for Makeup was not made permanent until 1981.",
  },

  "one-location": {
    connection:
      "The bottle film. Each story is confined to a single building or room, turning architecture into a pressure vessel: nobody can leave, so everything has to be settled in the space you can see.",
    options: [
      "The whole story is confined to one building the characters cannot leave",
      "Each film unfolds in real time, with no gaps at all between its scenes",
      "All six were written for the stage and adapted for the screen afterwards",
      "Every character is identified only by a role or a number, never by name",
    ],
    correctIndex: 0,
    triviaNote:
      "Confinement is a budget strategy as often as an artistic one. A single standing set means no location moves, no weather delays, and a schedule that can be shot in sequence — which is why so many debut features are set in one room.",
  },

  "dads-having-a-bad-one": {
    connection:
      "Fatherhood under extreme duress. Every film puts a father through something enormous — an ocean, a war, a dynasty, an event horizon — with a child on the other side of it.",
    options: [
      "Every film centres on a father going to extraordinary lengths for his child",
      "Each father in these films is a widower raising the child entirely alone",
      "All six stories take place over a period of less than a single week",
      "Every one of these fathers is estranged from the child when the film opens",
    ],
    correctIndex: 0,
    triviaNote:
      "Paternal jeopardy is one of the few premises that survives any genre transplant. The same emotional engine drives animated comedy, gangster tragedy and hard science fiction without needing a single line rewritten.",
  },

  "mountain-peak-peril": {
    connection:
      "Lethal height. Every film turns on vertical exposure — rock, ice, or thin air — where a single slip is not survivable and the mountain has no interest either way.",
    options: [
      "Every film turns on extreme height, where one mistake is not survivable",
      "All six of these films are dramatisations of events that really happened",
      "Every one of these stories takes place somewhere in the Himalayas",
      "Each protagonist is a professional mountaineer by training and by trade",
    ],
    correctIndex: 0,
    triviaNote:
      "Altitude does most of the work for free. Above about 8,000 metres the body cannot acclimatise and begins to deteriorate no matter how fit the climber — which is why that band is known as the death zone.",
  },

  "rain-soaked-cinema": {
    connection:
      "Rain as moral weather. Every film stages its turning points in a downpour, using water for mood, cover, and the visible suggestion that nobody here is going to stay clean.",
    options: [
      "Every film stages its decisive moments in heavy, unrelenting rainfall",
      "Each story unfolds in a city that is deliberately never named on screen",
      "All six were released inside the same five-year stretch of the nineties",
      "Every protagonist is a serving police detective working an active case",
    ],
    correctIndex: 0,
    triviaNote:
      "Screen rain is almost never real rain. Natural drizzle barely registers on camera, so crews run rain towers and light the water from behind, because a drop only reads to a lens when something is shining through it.",
  },

  "crimes-gone-stupid": {
    connection:
      "Clever plans, ordinary people. Each crime is genuinely well designed and then dismantled by panic, ego, greed, or somebody simply not being as good at this as they believed.",
    options: [
      "Every well-made plan collapses through incompetence, not through police work",
      "Each crime is carried out by people who have never met each other before that week",
      "All six are set in the same decade and share a single period soundtrack",
      "Every crime in these films goes completely undetected by any authority",
    ],
    correctIndex: 0,
    triviaNote:
      "The idiot-crime film only works if the plan is smart first. The audience has to believe it could succeed, so that the collapse lands as comedy rather than as watching fools be foolish.",
  },

  "so-bad-theyre-great": {
    connection:
      "Sincere failure. Each film misjudges tone, craft or its own ambition so completely — and so earnestly — that it became beloved for precisely the reasons it did not work.",
    options: [
      "Each film fails so sincerely and so totally that the failure became the appeal",
      "All six were critical successes that audiences turned against years later",
      "Every one was deliberately made badly, as a joke its makers were in on",
      "Each was abandoned by its director and quietly finished by somebody else entirely",
    ],
    correctIndex: 0,
    triviaNote:
      "Sincerity is the entry requirement for this canon. Deliberate parody almost never qualifies, because the pleasure depends on watching real ambition miss — and that is the one thing a film cannot fake.",
  },

  "trains-youd-rather-not-miss": {
    connection:
      "The train as pressure vessel. A sealed, linear space travelling at speed: you cannot get off, you cannot spread out, and whatever you are avoiding is a few carriages away.",
    options: [
      "Every story takes place aboard a moving train that nobody is able to leave",
      "Each journey is interrupted by the same kind of catastrophic engine failure",
      "All six are set within a single country and on the same rail network",
      "Every train in these films reaches its scheduled destination undamaged",
    ],
    correctIndex: 0,
    triviaNote:
      "Trains gave cinema one of its founding images. The Lumière brothers' 1896 'Arrival of a Train at La Ciotat' remains the most retold story about an audience meeting the moving image, whether or not anyone actually fled the room.",
  },

  "sequels-that-beat-the-original": {
    connection:
      "The better second film. Each is a follow-up widely judged to surpass what it followed, because it deepened the premise instead of repeating it.",
    options: [
      "Every film is a sequel widely considered better than the film before it",
      "Each was handed to a different director than the one who made the original",
      "All six arrived more than a decade after the film they were following",
      "Every one of these films brings its series to a definitive conclusion",
    ],
    correctIndex: 0,
    triviaNote:
      "The Godfather Part II was the first sequel to win Best Picture, and remains the standing argument that a second film can outgrow the first rather than merely extend it.",
  },

  "everyone-is-lying": {
    connection:
      "Withheld truth. Every film is built around information the audience is not given — an unreliable narrator, a hidden identity, or a reality that turns out to have been staged.",
    options: [
      "Each film is built on a truth deliberately hidden from you until very late",
      "Every protagonist is a professional investigator of one kind or another",
      "All six were adapted from short stories rather than from original scripts",
      "Each film's deception is fully revealed inside its opening twenty minutes",
    ],
    correctIndex: 0,
    triviaNote:
      "Concealment is harder on film than on the page and lands harder when it works. Audiences read the camera as neutral testimony, so a film that shows you something untrue is breaking a trust prose never had in the first place.",
  },

  "deserts-dust-bad-decisions": {
    connection:
      "The desert as antagonist. An indifferent, featureless landscape with no cover, no water, and no witnesses — where a bad decision has nothing to stop it.",
    options: [
      "The desert itself is the antagonist: no cover, no water and no witnesses",
      "Each film's central pursuit happens on foot rather than in any vehicle",
      "All six were shot on location in the same country and the same desert",
      "Every protagonist is searching for a specific person who has gone missing",
    ],
    correctIndex: 0,
    triviaNote:
      "The desert strips a frame to figure and horizon. With nothing else in shot a single person becomes the whole composition, which is why the landscape starts reading as a moral condition rather than as scenery.",
  },

  "that-house-was-a-mistake": {
    connection:
      "Architecture as antagonist. The house is not where the threat lives — the house is the threat, and every room is another part of it.",
    options: [
      "The building itself is the threat, not merely where the threat takes place",
      "Each family in these films has only just moved into the property",
      "Every story unfolds across a single night and ends before sunrise",
      "All six take place in isolated rural houses with no neighbours for miles around",
    ],
    correctIndex: 0,
    triviaNote:
      "These films spend their first act teaching you the floor plan. The dread later comes from violating a geography the audience has been trained to rely on — a door that should not be there, a corridor that runs the wrong way.",
  },

  "neon-dystopia": {
    connection:
      "High technology, low life. Rain-slicked artificial night, corporate power, and characters who cannot be certain their own minds belong to them.",
    options: [
      "Advanced technology paired with people unsure their minds are their own",
      "All six are set in the same fictional city across different decades",
      "Each film's central protagonist turns out to be an artificial being",
      "Every one takes place after an environmental collapse has already happened",
    ],
    correctIndex: 0,
    triviaNote:
      "Blade Runner's permanent wet night was practical before it was iconic: darkness and rain hide the seams of a built set, and the workaround became the visual grammar of an entire genre.",
  },

  "trapped-in-a-loop": {
    connection:
      "Repetition as structure. Each film runs the same stretch of time again and again, and the plot is not escape — it is the person inside the loop becoming someone who deserves to leave it.",
    options: [
      "Each protagonist repeats the same stretch of time until they finally change",
      "Every loop in these films is caused by the same piece of failing technology",
      "All six are told in strict chronological order with no jumps at all",
      "Each protagonist understands what is happening from the very first scene",
    ],
    correctIndex: 0,
    triviaNote:
      "The loop is one of the few structures that powers comedy and horror equally well. Repetition is the mechanism of a running joke and the mechanism of dread; only the content of the repeat decides which you get.",
  },

  "undercover-lies": {
    connection:
      "Assumed identity. Every protagonist is living as someone they are not, for long enough that the performance starts to win and loyalty stops being something they control.",
    options: [
      "Every protagonist sustains a false identity that starts consuming the real one",
      "Each deception in these films is carried out by a sworn officer of the law",
      "All six are set in the same decade and in the same corner of the criminal underworld",
      "Every impostor here is exposed and caught well before the final act begins",
    ],
    correctIndex: 0,
    triviaNote:
      "The impostor thriller runs on dramatic irony. Because the audience knows the secret and the room does not, an ordinary conversation about nothing becomes the most tense scene in the film.",
  },

  "high-seas-peril": {
    connection:
      "Open water. No ground, no shelter, and no rescue within reach — a setting whose entire threat is that there is nothing solid anywhere.",
    options: [
      "Open water with nothing solid underfoot is the central, inescapable danger",
      "Each of these films is a dramatisation of a real maritime disaster",
      "Every story is set aboard a commercial passenger ship carrying civilians",
      "All six take place entirely at sea, without ever once touching dry land",
    ],
    correctIndex: 0,
    triviaNote:
      "Water shoots are the standing warning of film production. Jaws ran famously over schedule fighting the open sea, and its constantly malfunctioning shark forced the restraint that made the film work.",
  },

  "courtroom-fire": {
    connection:
      "Argument as action. The conflict turns on people talking inside a formal room where the rules of speech are the rules of the fight, and a verdict supplies the climax.",
    options: [
      "The decisive conflict is argued out in a courtroom rather than acted out",
      "Every film follows the same defence lawyer across a series of cases",
      "Each verdict handed down in these films is ultimately a guilty conviction",
      "All six are careful dramatisations of real trials that actually happened",
    ],
    correctIndex: 0,
    triviaNote:
      "The courtroom is theatre imported wholesale: a fixed space, enforced turn-taking, and a built-in ending. The genre barely has to invent structure, because the institution arrives with one already installed.",
  },

  "the-grand-heist": {
    connection:
      "The plan and its collapse. Assemble a crew, explain the method, execute it, and meet the one variable nobody accounted for — the audience is taught the machine so it can enjoy the breakage.",
    options: [
      "Each film explains a plan in detail so you can watch it go wrong live",
      "Every crew in these films is assembled by the same kind of criminal broker",
      "All six of the robberies depicted here target a bank and its main vault",
      "Each crew gets away clean, without losing a single one of its members",
    ],
    correctIndex: 0,
    triviaNote:
      "Heist films front-load their exposition on purpose. The pleasure is procedural: you cannot enjoy watching a plan fail unless you were shown clearly enough to notice the moment it does.",
  },

  "culinary-meltdowns": {
    connection:
      "Food as the whole world. Cooking is not set dressing here — the kitchen supplies the hierarchy, the pressure, the ambition, and the standard by which every character is judged.",
    options: [
      "Cooking is the organising subject, supplying the pressure and the hierarchy",
      "Every film is set in a single restaurant that has closed by the ending",
      "Each protagonist is a formally trained chef working at a professional level",
      "All six take place across one service, from first cover to last order",
    ],
    correctIndex: 0,
    triviaNote:
      "Screen food is styled rather than cooked to be eaten. It is built to survive hot lights and twenty takes, which is why it routinely looks better than it could ever taste.",
  },

  "space-silence": {
    connection:
      "The indifferent vacuum. Isolation measured in millions of miles, air measured in hours, and an environment with no opinion whatsoever about whether anyone survives it.",
    options: [
      "Space supplies the danger: no air, no rescue, and no second chances at all",
      "Each crew is undone by a hostile intelligence already aboard their ship",
      "All six are set within the boundaries of our own solar system",
      "Every mission depicted in these films returns home completely intact",
    ],
    correctIndex: 0,
    triviaNote:
      "Sound in space is a cheat nearly every film makes, because true silence reads to an audience as a projection fault. The films that hold their nerve get their loudest effect for nothing.",
  },

  "unhinged-holidays": {
    connection:
      "The holiday as trap. A fixed date, a full house, and expectations nobody can meet but everybody has agreed to attempt — the season supplies the pressure and the plot.",
    options: [
      "The season itself creates the pressure: forced proximity and expectation",
      "Each of these films is set on the same single day of the calendar year",
      "Every family here is being reunited after a long and bitter estrangement",
      "All six were released during the very holiday season that they depict",
    ],
    correctIndex: 0,
    triviaNote:
      "A holiday hands a writer two gifts: a deadline nobody can move, and a plausible reason for people who avoid each other to be trapped in one room. The conflict comes pre-installed.",
  },

  "frozen-wastelands": {
    connection:
      "Cold as antagonist. Exposure, isolation, and the particular paranoia of a place where going outside is not survivable and nobody can simply leave.",
    options: [
      "Extreme cold supplies the threat: exposure, isolation and nowhere to go",
      "Each film's cold is the direct result of a deliberate act by a person",
      "All six are set in the same country and within the same latitude band",
      "Every character who steps outside in these films dies before returning",
    ],
    correctIndex: 0,
    triviaNote:
      "Visible breath is a continuity nightmare, because it has to match across takes shot hours apart. Cold scenes are often filmed on refrigerated stages precisely so the breath can be controlled rather than hoped for.",
  },

  "summer-gone-wrong": {
    connection:
      "Daylight and dread. Warmth, holiday and open sun used as the frame for something that curdles — the brightness is not relief, it is the joke.",
    options: [
      "Bright, warm summer settings that curdle into something much darker",
      "Every film centres on a group of children with no adults present at all",
      "Each of these stories takes place at a coastal resort during high season",
      "All six are set during a single summer, in the same year, in one town",
    ],
    correctIndex: 0,
    triviaNote:
      "Daylight horror is the harder trick. Darkness does half the work of hiding things, so a film that manages to frighten you at noon has to build dread out of composition and behaviour instead.",
  },

  "fast-lanes-high-octane": {
    connection:
      "Driving as the subject. The car is not transport between scenes — it is what the film is about, and the camera, the cutting and the sound are all built around it.",
    options: [
      "Driving is the subject itself, not the means of moving between scenes",
      "Every protagonist drives professionally for a living of some kind",
      "Each film's central vehicle is completely destroyed before the ending",
      "All six take place on public roads rather than on any closed circuit",
    ],
    correctIndex: 0,
    triviaNote:
      "Screen speed is mostly lens height and cutting rhythm. Mount a camera low and close to the tarmac, shorten the shots, and forty miles an hour reads as a hundred — which is cheaper, safer and far easier to control.",
  },

  "90s-explosive-action": {
    connection:
      "The nineties template. One capable but outmatched hero, a confined arena, a ticking clock, and spectacle that had to physically happen in front of the lens.",
    options: [
      "One outmatched hero, a contained arena, a clock, and practical destruction",
      "Every hero in these films is a serving police officer on active duty",
      "Each villain is driven purely by ideology rather than by any profit motive",
      "All six of these stories unfold over considerably more than a single week",
    ],
    correctIndex: 0,
    triviaNote:
      "Action of this era bought its spectacle physically. Real fire, real squibs, real stunt performers — which meant the budget went into things that had to work on the day, in one take, with people standing nearby.",
  },

  "gothic-shadows": {
    connection:
      "The gothic mode. Deep shadow, decaying grandeur, and antagonists written as figures of tragedy or compulsion rather than as simple obstacles.",
    options: [
      "Deep shadow and decay, with antagonists written as tragic rather than evil",
      "Each film's antagonist is explicitly supernatural rather than merely human",
      "All six are period pieces set well before the turn of the twentieth century",
      "Every one of these stories takes place in a European city after dark",
    ],
    correctIndex: 0,
    triviaNote:
      "German Expressionism supplied the vocabulary: angular sets, hard shadow, skewed perspective. The same toolkit crossed the Atlantic with its émigré directors and became film noir barely two decades later.",
  },

  "whodunit-manor": {
    connection:
      "Withheld solution. Each film is a puzzle box built to be re-watched, where the ending re-frames everything before it and the clues were on screen the whole time.",
    options: [
      "Each hides a solution in plain sight that re-frames everything on a rewatch",
      "Every story features a professional consulting detective as its lead",
      "All six take place inside a single large country house over one long weekend",
      "Each film's culprit confesses openly and fully before the final scene arrives",
    ],
    correctIndex: 0,
    triviaNote:
      "The genre's founding contract is fair play: the audience must see every clue the detective sees. A solution resting on withheld information is considered a cheat rather than a twist.",
  },

  "suburban-dystopia": {
    connection:
      "The suburb as stage set. Immaculate lawns and cul-de-sacs presented so the film can show you the effort of maintaining them — and what the maintenance is hiding.",
    options: [
      "Manicured suburban surfaces exist so the film can show what they conceal",
      "Every film's protagonist is an adult who owns the home they live in",
      "Each of these stories is set inside a gated and privately policed community",
      "All six of these films were written and released within the same decade",
    ],
    correctIndex: 0,
    triviaNote:
      "Suburban unease is a postwar genre. It only functions as horror once an audience already reads a tidy lawn as an achievement worth defending — which is the anxiety these films are actually about.",
  },

  "boxing-redemption": {
    connection:
      "Fighting as self-examination. Every film uses physical combat to settle a question that has nothing to do with winning — the bout is where a character finds out what they are.",
    options: [
      "Fighting is used to settle a question about the character, not the contest",
      "Every protagonist here is a professional, licensed and ranked boxer",
      "Each film ends with the protagonist winning a championship title outright",
      "All six are set in the same city and in the same working-class district",
    ],
    correctIndex: 0,
    triviaNote:
      "Fight films break the sports-movie rule more often than they keep it. The genre's most famous ending is a loss, because going the distance turned out to be the part worth filming.",
  },

  "journalism-truth": {
    connection:
      "The reporting is the thriller. Suspense assembled out of sourcing, verification and institutional pressure rather than out of physical danger to the reporter.",
    options: [
      "The suspense is the reporting: sourcing, verifying, and getting it printed",
      "Every film is set inside the newsroom of a daily metropolitan newspaper",
      "Each of these stories takes place in the same decade of American history",
      "Every reporter here is working without the approval of any editor at all",
    ],
    correctIndex: 0,
    triviaNote:
      "These films make paperwork suspenseful. The tension sits in whether a second source will confirm — an undramatic act the genre has learned to shoot like a countdown.",
  },

  "hallway-shootouts": {
    connection:
      "Choreography held in frame. Each film contains a signature sequence built on sustained, legible physical action, where the camera holds long enough that you can see the whole thing working.",
    options: [
      "Each has a signature sequence built on sustained, clearly legible action",
      "Every action scene in these films is captured in one single unbroken take",
      "Each film's hero fights his way through without ever using a firearm",
      "All six of these films were made and released after the year 2000",
    ],
    correctIndex: 0,
    triviaNote:
      "Legibility is the whole argument. Holding a wider frame for longer trusts the performer and the choreography, where fast cutting can manufacture excitement while hiding what actually happened.",
  },

  "wild-west-standoff": {
    connection:
      "The frontier and its code. Open country, an agreed ritual of confrontation, and violence framed as a moral transaction rather than as spectacle.",
    options: [
      "Frontier settings where violence follows a code rather than erupting at random",
      "Every protagonist is a serving sheriff or a federally appointed territorial marshal",
      "Each of these films ends with its hero riding away alone into open country",
      "All six of these westerns were written and directed after 1990",
    ],
    correctIndex: 0,
    triviaNote:
      "Sergio Leone turned the standoff into an editing exercise: extreme close-ups on eyes and hands, held far past comfort, until stillness became more tense than any exchange of fire.",
  },

  "jazz-and-obsession": {
    connection:
      "Obsession with performance. Each film is about someone chasing mastery of an art form past the point where it stops being good for them.",
    options: [
      "Each is about chasing artistic mastery past the point of personal cost",
      "Every protagonist is a working professional musician by trade and training",
      "Each film's central performance ends in public and humiliating failure",
      "All six are original musicals written directly for the screen",
    ],
    correctIndex: 0,
    triviaNote:
      "Musician films succeed or fail on the performer's hands. One convincing unbroken shot of someone genuinely playing buys more credibility than any amount of cutting around the problem.",
  },

  "monsters-in-the-mist": {
    connection:
      "Scale and withholding. Something enormous is out there, and each film manages your view of it — obscured, glimpsed, or held back — so the creature stays larger in your head than on screen.",
    options: [
      "Each withholds a full view of its creature to keep it larger than the screen",
      "Every creature in these films is the product of human experimentation",
      "All six of these stories are set in small coastal towns and fishing communities",
      "Each film reveals its monster completely within the first ten minutes",
    ],
    correctIndex: 0,
    triviaNote:
      "Restraint is often forced. Jaws hid its shark because the shark did not work, and the resulting suggestion-first approach became the standing lesson for creature features that came after.",
  },

  "creepy-dolls-puppets": {
    connection:
      "The uncanny valley. Objects and figures built to look almost human — which is precisely the wrong amount of human for anyone to feel comfortable around.",
    options: [
      "Something almost-but-not-quite human moves when it very much should not",
      "Every one of these films is set inside a toy factory or a toy shop",
      "Each object here is possessed by the spirit of a specific dead person",
      "All six were made and marketed for an adult audience exclusively",
    ],
    correctIndex: 0,
    triviaNote:
      "The effect has a name and a graph. Roboticist Masahiro Mori proposed the uncanny valley in 1970: affinity climbs with human likeness, then falls off a cliff just before the likeness becomes convincing.",
  },

  "high-stakes-gambling": {
    connection:
      "Risk as character. Money placed at stake to expose what someone believes about luck, control, and their own ability to stop — the wager is a diagnostic.",
    options: [
      "Enormous risk exposes what a character believes about their own control",
      "Every protagonist here is a professional gambler who plays for a living",
      "Each film's climax is decided by the turn of a single hand of cards",
      "All six of these stories are set inside casinos and private card rooms",
    ],
    correctIndex: 0,
    triviaNote:
      "Gambling scenes have to teach the rules and raise the stakes simultaneously. Hence the table-level insert and the character who explains the odds aloud to nobody in particular.",
  },

  "transit-at-30000-feet": {
    connection:
      "Sealed and airborne. A pressurised vessel with no exit, no help in range, and a floor several miles above anywhere that could help you.",
    options: [
      "A sealed craft in flight, with no exit and no help within any reach",
      "Every one of these films features a hijacking carried out mid-flight",
      "Each aircraft depicted in these films crashes before the story ends",
      "All six take place entirely aboard a single aircraft from start to finish",
    ],
    correctIndex: 0,
    triviaNote:
      "Aircraft interiors are nearly always sets. A real fuselage leaves no room for a camera, lights and crew, so productions build cabins with lift-out seats and walls that swing away.",
  },

  "coming-of-age-roadtrip": {
    connection:
      "Growing up in motion. A journey away from home doing the work of a character arc — distance covered standing in for a change nobody can yet articulate.",
    options: [
      "A journey from home carries the growing up, distance standing in for change",
      "Each film's journey is undertaken by car along a single mapped route",
      "Every protagonist here is leaving home for the last and final time",
      "All six of these stories take place over one long and unusually formative summer",
    ],
    correctIndex: 0,
    triviaNote:
      "The road movie arrives with structure attached: episodes strung along a route, a cast that can change at any stop, and an ending guaranteed by arrival. It is the loosest genre with the firmest skeleton.",
  },

  "surreal-dreamscapes": {
    connection:
      "Rules that bend. Each film builds a world where space, time or causality behave by association rather than physics, and never apologises for it.",
    options: [
      "Each world runs on association and dream logic rather than physical rules",
      "Every story is revealed in its final scene to have been somebody's dream",
      "Each protagonist is trying to return to a home they were taken from",
      "All six of these films are animated rather than photographed live",
    ],
    correctIndex: 0,
    triviaNote:
      "Surrealist cinema began as a deliberate project to film the unconscious. Buñuel and Dalí's 1929 Un Chien Andalou set the rule its descendants still follow: images chosen for association, never for explanation.",
  },

  "sarcastic-crusaders": {
    connection:
      "Comedy as armour. Heroes who meet every threat with a joke, because sincerity would cost them something — and because the humour lets the film stage absurdity without collapsing.",
    options: [
      "Every hero deflects danger with humour rather than with any gravity",
      "Each protagonist works entirely alone, without a team or any partner",
      "Every one of these films is an origin story told right from the very beginning",
      "All six of these heroes gained their abilities entirely by accident",
    ],
    correctIndex: 0,
    triviaNote:
      "The quip is a tonal safety valve. A hero who acknowledges the absurdity of the situation lets the audience enjoy it, instead of deciding the film has stopped working.",
  },

  "toxic-best-friends": {
    connection:
      "Intimacy weaponised. The relationship is the danger: everything that makes the bond convincing is exactly what makes its collapse cost something.",
    options: [
      "The close relationship itself becomes the source of the real damage",
      "Every friendship in these films is fully repaired before the ending",
      "Each pair of friends meets one another for the very first time on screen",
      "All six of these stories are set in and around a single high school",
    ],
    correctIndex: 0,
    triviaNote:
      "These films spend the first act making you enjoy the friendship. That is structure, not sentiment — the audience has to want it to survive before its collapse can land.",
  },

  "post-apocalyptic-ruins": {
    connection:
      "After the collapse. Civilisation has already ended off screen, and the story concerns scarcity, salvage, and whatever people assemble from what is left.",
    options: [
      "Civilisation has already fallen, and the story is what gets built after",
      "Each of these worlds was ended by a nuclear exchange between states",
      "Every film follows a group travelling toward a rumoured place of safety",
      "All six are set at least a full century after the collapse happened",
    ],
    correctIndex: 0,
    triviaNote:
      "Post-apocalyptic design works by addition rather than invention. Costumes and vehicles are built to read as salvage — familiar objects bolted together — so an audience can date the collapse at a glance.",
  },

  "artificial-hearts": {
    connection:
      "Manufactured feeling. Machines that may or may not experience anything, and the people around them who discover they have no reliable way to tell.",
    options: [
      "Each asks whether a made mind can feel, and finds no way to be certain",
      "Every artificial character in these films eventually turns on its creator",
      "Each story is set on a version of Earth that humanity has abandoned",
      "All six artificial beings are indistinguishable from humans by sight alone",
    ],
    correctIndex: 0,
    triviaNote:
      "The question predates the genre. Alan Turing's 1950 imitation game sidestepped whether a machine can think and asked only whether we could tell the difference — which is precisely the trap these films set.",
  },

  "high-school-social-warfare": {
    connection:
      "Status as plot. High school rendered as a rigid caste system, where social position is the scarce resource and everyone is either defending or attacking a place in it.",
    options: [
      "School hierarchy is the actual plot, with status as the scarce resource",
      "Every protagonist is a new arrival trying to find a place at the school",
      "Each of these films covers a complete academic year from autumn to summer",
      "Every one ends with the social hierarchy entirely intact and unchanged",
    ],
    correctIndex: 0,
    triviaNote:
      "Visible cliques are a structural shortcut. One shot across a cafeteria can establish an entire social order and every stake in the film without a line of dialogue.",
  },

  "golden-age-giants": {
    connection:
      "The studio era. Films made inside the Hollywood system at its most industrial — contract talent, house style, and craft organised like a production line.",
    options: [
      "All were made inside the old studio system, with contract cast and crew",
      "Each of these films was produced and released by the very same studio",
      "Every one of these films was photographed entirely in black and white",
      "All six were adapted from successful Broadway stage productions",
    ],
    correctIndex: 0,
    triviaNote:
      "The studio system kept actors, writers, composers and crews on long-term contract. The era's films share a look partly because, to a remarkable degree, the same people really did make all of them.",
  },

  "haunted-hotels": {
    connection:
      "Buildings that keep people. Structures designed for passing through, occupied by something that stayed — and laid out so you lose your bearings without noticing.",
    options: [
      "Each building is made for passing through, and something in it never left",
      "Every haunting is caused by a death that occurred on the premises",
      "Each film's threat disappears the moment the characters leave the building",
      "All six of these stories are set in hotels with long empty corridors",
    ],
    correctIndex: 0,
    triviaNote:
      "Repeating architecture is ideal horror design. Identical doors and corridors defeat an audience's instinct to map a space, so disorientation arrives without the film having to do anything at all.",
  },

  "magic-and-illusions": {
    connection:
      "Misdirection as method. Each film performs a trick on the audience while showing you someone performing one — the real sleight of hand is the edit.",
    options: [
      "Each film performs its own act of misdirection on the watching audience",
      "Every protagonist here is a professional stage magician by trade and training",
      "Each film's method is explained fully within its opening few minutes",
      "All six of these stories are set in the late nineteenth century",
    ],
    correctIndex: 0,
    triviaNote:
      "Cinema and stage magic share a parent. Georges Méliès was a working illusionist who owned a theatre before he owned a camera, and he discovered the substitution splice by accident while filming a Paris street.",
  },

  "espionage-in-the-cold": {
    connection:
      "Secrecy and consequence. Covert operations, compartmented information, and people acting on partial knowledge where being wrong is measured in other people's lives.",
    options: [
      "Covert work where people act on partial information at others' expense",
      "Every protagonist is a career intelligence officer with formal training",
      "Each of these films is set during the Cold War and its immediate aftermath",
      "All six were adapted from espionage novels by their original authors",
    ],
    correctIndex: 0,
    triviaNote:
      "The spy genre split almost immediately into two traditions: the tailoring and the gadgets on one side, and on the other the version written by people who had done the job and found it mostly paperwork.",
  },

  "midnight-drive": {
    connection:
      "The city after dark. Night as a mood rather than a time — empty roads, artificial light, and characters doing their thinking while everyone else is asleep.",
    options: [
      "Night is a mood rather than a time: artificial light, empty streets, solitude",
      "Each protagonist drives for a living and is entirely defined by that profession",
      "Every one of these films is scored entirely with electronic instruments",
      "All six of these stories take place in and around Los Angeles",
    ],
    correctIndex: 0,
    triviaNote:
      "Night exteriors are among the most expensive things a production can attempt. Lighting a street to look unlit takes more equipment than shooting the same street at noon.",
  },

  "diner-conversations": {
    connection:
      "Dialogue doing the work. Ordinary rooms — booths, kitchens, cars — where two people talking carries more weight than anything else in the film.",
    options: [
      "Long conversations in ordinary rooms carry the weight action usually would",
      "Each film opens and closes in exactly the same single location",
      "Every conversation in these films concerns a serious crime being planned",
      "All six of these stories take place over the course of a single day",
    ],
    correctIndex: 0,
    triviaNote:
      "The diner is a screenwriter's stage: public enough that characters must behave, private enough that they will talk, and cheap enough to hold for a whole shooting day.",
  },

  "cinematic-masterpieces": {
    connection:
      "The popular canon. Films that sit at the top of audience-voted lists — enormously seen, endlessly quoted, and treated as common cultural reference points.",
    options: [
      "Each sits near the top of audience-voted lists of the greatest films made",
      "Every one of these films won the Academy Award for Best Picture",
      "Each was a commercial disappointment on its original theatrical release",
      "All six of these films were released within the same single decade",
    ],
    correctIndex: 0,
    triviaNote:
      "Popular canons and critical canons rarely agree. Sight and Sound's once-a-decade critics' poll and the audience-voted lists overlap far less than you would expect, and the gap between them is its own argument.",
  },
};
