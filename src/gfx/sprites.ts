// Side-view sprites. The raccoon faces right, critters face left.

export const COON_IDLE_0 = [
  '..................',
  '..........kk.kk...',
  '.........kgdkgdk..',
  '.........kgggggk..',
  '........kgwwwgggk.',
  '.kk.....kkkwkkkkkk',
  'kgdk...kkgkkkkwwwk',
  'kddgk.kgggkwwwwwkk',
  '.kgdkkgggggkkkkk..',
  '..kggggglllggk....',
  '...kgglllllllgk...',
  '...kggllllllggk...',
  '....kggggggggk....',
  '....kgk.kgk.kgk...',
  '....kk..kk..kk....',
];

export const COON_IDLE_1 = [
  '..................',
  '..................',
  '..........kk.kk...',
  '.........kgdkgdk..',
  '.........kgggggk..',
  '.kk.....kgwwwgggk.',
  'kgdk....kkkwkkkkkk',
  'kddgk..kkgkkkkwwwk',
  '.kgdkkkgggkwwwwwkk',
  '..kgggggglkkkkkk..',
  '...kgglllllllgk...',
  '...kggllllllggk...',
  '....kggggggggk....',
  '....kgk.kgk.kgk...',
  '....kk..kk..kk....',
];

export const COON_WALK_0 = COON_IDLE_0;
export const COON_WALK_1 = [
  ...COON_IDLE_0.slice(0, 13),
  '.....kgkkgk.kgk...',
  '.....kk.kk...kk...',
];

// Lunging swipe, paw forward.
export const COON_ATTACK = [
  '..................',
  '...........kk.kk..',
  '..........kgdkgdk.',
  '..........kgggggk.',
  '.........kgwwwgggk',
  '..kk.....kkkwkkkkk',
  '.kgdk...kkgkkkkwwk',
  '.kddgk.kgggkwwwwwk',
  '..kgdkkgggggkkkkk.',
  '...kggggglllggkkk.',
  '....kgglllllllgwwk',
  '....kggllllllggkk.',
  '.....kggggggggk...',
  '....kgk....kgk....',
  '....kk......kk....',
];

export const COON_HURT = [
  '..................',
  '.......kk.kk......',
  '......kgdkgdk.....',
  '......kgggggk.....',
  '.....kgwwwgggk....',
  'kk...kkkxkkkkkk...',
  'gdk.kkgkkkkwwwk...',
  'ddgkkgggkwwwwwkk..',
  'kgdkgggggkkkkk....',
  '.kggggglllggk.....',
  '..kgglllllllgk....',
  '..kggllllllggk....',
  '...kggggggggk.....',
  '...kgk.kgk.kgk....',
  '...kk..kk..kk.....',
].map((r) => r.replace('x', 'w'));

// ---- critters (facing left)

export const RAT_0 = [
  '...kk.........',
  '..kPnk........',
  '.knnnnk.....P.',
  'kknrnnnkkk.P..',
  'Pknnnnnnnnkk..',
  '.kknnnnnnnnk..',
  '...knk..knk...',
  '...kk...kk....',
];
export const RAT_1 = [
  '..............',
  '...kk.........',
  '..kPnk......P.',
  '.knnnnk....P..',
  'kknrnnnkkkk...',
  'Pknnnnnnnnnk..',
  '.kknnnnnnnnk..',
  '....knkknk....',
];

export const PIGEON_0 = [
  '..kk..........',
  '.kllk.........',
  'ykrlk..kkk....',
  '.kGDkkklllk...',
  '..kDllllgllk..',
  '..kllllllllkk.',
  '...kklllllkdk.',
  '.....kyk.yk...',
];
export const PIGEON_1 = [
  '..kk...kkkk...',
  '.kllk.kllllk..',
  'ykrlk.kgllk...',
  '.kGDkkklllk...',
  '..kDllllgllk..',
  '..kllllllllkk.',
  '...kklllllkdk.',
  '.....kyk.yk...',
];

export const CAT_0 = [
  '.k..k...........',
  'kok.ok..........',
  'koooook.........',
  'kGkoGok.........',
  'koooPok.....kk..',
  '.kwkook....kok..',
  '..kooonoonooook.',
  '..kooooooooook..',
  '..koonoooonok...',
  '..kok.kok.kok...',
  '..kk..kk..kk....',
];
export const CAT_1 = [
  '.k..k...........',
  'kok.ok......kk..',
  'koooook.....kok.',
  'kGkoGok......ok.',
  'koooPok......ok.',
  '.kwkook.....kok.',
  '..kooonoonooook.',
  '..kooooooooook..',
  '..koonoooonok...',
  '...kok.kok.kok..',
  '...kk..kk..kk...',
];

export const CROW_0 = [
  '....kk........',
  '...kddk.......',
  'yykrdddk......',
  '..kdddddkkk...',
  '...kddgddddkk.',
  '...kdddggdddkk',
  '....kkddddkk..',
  '......kyky....',
];
export const CROW_1 = [
  '....kk...kk...',
  '...kddk.kdgk..',
  'yykrdddkddgk..',
  '..kdddddkdk...',
  '...kddddddddk.',
  '...kddddddddkk',
  '....kkddddkk..',
  '......kyky....',
];

export const DOG_0 = [
  '..kk............',
  '.kNNk...........',
  'kkNnnkk.........',
  'knkwnnnk........',
  'knnnnnnk.....kk.',
  'kknnwwnkkkkkknk.',
  '.krkwwknnnnnnnk.',
  '..kknnnnnnnnnk..',
  '...knnnnnnnnnk..',
  '...knnkkkknnnk..',
  '...knk...knnk...',
  '...kk.....kk....',
];
export const DOG_1 = [
  '..kk............',
  '.kNNk...........',
  'kkNnnkk.........',
  'knkwnnnk......k.',
  'knnnnnnk.....kn.',
  'kknnwwnkkkkkknk.',
  '.kkkwwknnnnnnnk.',
  '..kknnnnnnnnnk..',
  '...knnnnnnnnnk..',
  '...knnkkkknnnk..',
  '....knk..knk....',
  '....kk...kk.....',
];

export const POSSUM_0 = [
  '.kk.............',
  'kwPk............',
  'kwwwk...........',
  'kkwwlk..........',
  '.kwwllkkkkk.....',
  '..kllllllllkk...',
  '..klllgllllllk..',
  '..kllllllllllkP.',
  '...kllkkkllk..P.',
  '...kk....kk..P..',
];
export const POSSUM_1 = [
  '................',
  '.kk.............',
  'kwPk............',
  'kwwwk...........',
  'kkwwlkkkkkk.....',
  '.kwwllllllllk...',
  '..klllgllllllk..',
  '..kllllllllllkP.',
  '...kllkkkllk.P..',
  '...kk....kk..P..',
];
// Lid shield the possum holds up for allies.
export const LID = ['.kkk.', 'klllk', 'klwlk', 'klllk', 'klllk', 'klllk', '.kkk.'];

export const SKUNK_0 = [
  '.........kk...',
  '........kwwk..',
  '.kk....kwkkwk.',
  'kwkk..kwk..k..',
  'kkkkkkwkk.....',
  'kGkkkkwkk.....',
  '.kkkkkkkkkk...',
  '..kkwwwwkkkk..',
  '..kkkkkkkkkk..',
  '...kk...kk....',
];
export const SKUNK_1 = [
  '..........kk..',
  '.........kwwk.',
  '.kk.....kwkkwk',
  'kwkk...kwk..k.',
  'kkkkkkkwkk....',
  'kGkkkkwkk.....',
  '.kkkkkkkkkk...',
  '..kkwwwwkkkk..',
  '..kkkkkkkkkk..',
  '....kk...kk...',
];

export const GATOR_0 = [
  '....kk..kk..........',
  '...kGGkkGGk.........',
  'kkkGyGGGyGGkkkk.....',
  'kwkwkwkwGGGGGGGkkk..',
  '.kkkkkkkGGLGGLGGGkk.',
  '.kwkwkwkGGGGGGGGGGGk',
  '..kkkkkkkGGkkkGGkkk.',
  '........kGk...kGk...',
  '........kk....kk....',
];
export const GATOR_1 = [
  '....kk..kk..........',
  '...kGGkkGGk.........',
  '.kkGyGGGyGGkkkk.....',
  'kkwkwkwkGGGGGGGkkk..',
  'k.kkkkkkGGLGGLGGGkk.',
  'kkwkwkwkGGGGGGGGGGGk',
  '..kkkkkkkGGkkkGGkkk.',
  '.........kGk.kGk....',
  '.........kk..kk.....',
];

// ---- bosses (facing left)

export const VAN_0 = [
  '...........kkkkkkkkkkkkkkkkkkk..',
  '.........kkrrbbkwwwwwwwwwwwwwwk.',
  '.......kkwwkkkkkwwwwwwwwwwwwwwwk',
  '.....kkwwwkBBBBkwwwwwwwwwwwwwwwk',
  '....kwwwwwkBcBBkwwwrrrrrrrrrwwwk',
  '...kwwwwwwkBBcBkwwwrwwwwwwwrwwwk',
  '..kwwwwwwwkBBBBkwwwrrrrrrrrrwwwk',
  '.kwwwwwwwwkkkkkkwwwwwwwwwwwwwwwk',
  'kyywwwwwwwwwwwwkwwwwwwwwwwwwwwwk',
  'kyywwwwwwwwwwwwkwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwkwwwwwwwwwwwwwwwk',
  'kgggggggggggggggggggggggggggggggk',
  'kkk.kkkk.kkkkkkkkkkkkk.kkkk.kkk.',
  '...kdddk..............kdddk.....',
  '...kdgdk..............kdgdk.....',
  '....kkk................kkk......',
];
export const VAN_1 = VAN_0.map((r, i) => (i === 1 ? r.replace('rrbb', 'bbrr') : r));

export const GOOSE_0 = [
  '....kkkk..............',
  '...kwwwwk.............',
  'kookwkwwk.............',
  'koooowwwk.............',
  '.kkkkwwwk.............',
  '....kwwk..............',
  '....kwwk..............',
  '....kwwk..............',
  '....kwwwk.....kkk.....',
  '....kwwwwkkkkkwwlk....',
  '...kwwwwwwwwwwwwllk...',
  '...kwwwwwwwwwwllllkk..',
  '...kwwwwwwlllllllllk..',
  '....kwwwwwwllllllllk..',
  '.....kwwwwwwwwwwwwk...',
  '......kkkwwwwwwwkk....',
  '........kkoookkk......',
  '.........ko.ok........',
  '........koo.ook.......',
];
export const GOOSE_1 = [
  '......................',
  '....kkkk..............',
  '...kwwwwk.............',
  'kookwkwwk.............',
  'koooowwwk.............',
  '.kkkkwwwk.............',
  '....kwwk..............',
  '....kwwk......kkk.....',
  '....kwwwk...kkwwlk....',
  '....kwwwwkkkwwwwllk...',
  '...kwwwwwwwwwwwwllk...',
  '...kwwwwwwwwwwllllkk..',
  '...kwwwwwwlllllllllk..',
  '....kwwwwwwllllllllk..',
  '.....kwwwwwwwwwwwwk...',
  '......kkkwwwwwwwkk....',
  '........kkoookkk......',
  '.........ko.ok........',
  '........koo.ook.......',
];

export const RATKING_0 = [
  '.....y.y.y..........',
  '.....yyyyy..........',
  '....kyryyyk.........',
  '...knnnnnnnk........',
  '..kPknnnnnnnk.......',
  '.knrrnnnnnnnnkkk....',
  'kknnnnnnnnnnnnnnkk..',
  'Pknnnnnnnnnnnnnnnnk.',
  '.kkwnnnnnnlllnnnnnk.',
  '..kknnnnnlllllnnnnkP',
  '...knnnnnlllllnnnk.P',
  '...knnnnnnnnnnnnnkP.',
  '....knnkkkkkknnnk...',
  '....knnk....knnk....',
  '....kkk.....kkk.....',
];
export const RATKING_1 = [
  '....................',
  '.....y.y.y..........',
  '.....yyyyy..........',
  '....kyryyyk.........',
  '...knnnnnnnk........',
  '..kPknnnnnnnkkkk....',
  '.knrrnnnnnnnnnnnkk..',
  'kknnnnnnnnnnnnnnnnk.',
  'Pkkwnnnnnnlllnnnnnk.',
  '.kknnnnnnlllllnnnnkP',
  '...knnnnnlllllnnnkP.',
  '...knnnnnnnnnnnnnk.P',
  '....knnkkkkkknnnk...',
  '.....knk....knk.....',
  '.....kk.....kk......',
];

// ---- props and fx

export const CHEST = [
  '.kkkkkkkkk.',
  'knnnnnnnnnk',
  'kNNNNyNNNNk',
  'kkkkkykkkkk',
  'knnnnynnnnk',
  'knnnnnnnnnk',
  'kNNNNNNNNNk',
  '.kkkkkkkkk.',
];

export const SIGN = [
  'kkkkkkkkkkkk',
  'knnnnnnnnnnk',
  'knnnnnnnnnnk',
  'knnnnnnnnnnk',
  'kkkkkkkkkkkk',
  '.....kk.....',
  '.....nk.....',
  '.....nk.....',
  '.....nk.....',
  '.....nk.....',
];

export const SHOPKEEP = [
  '...kkkkk....',
  '..kOOOOOk...',
  '.kkkkkkkkk..',
  '..kllllk....',
  '.kwkllkwk...',
  '.kkkkkkkk...',
  '..klwwwlk...',
  '..kllklk....',
  '.klllllllk..',
  '.kllgggllk..',
  '.kllllllk...',
  '..kk..kk....',
];
