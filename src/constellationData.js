// IAU constellation data — 88 official constellations.
// Codes match the 3-letter IDs used in public/data/constellations.lines.json.
// Detail level: rank-1 (major, naked-eye famous) get fuller cards with mythology
// and 3 facts; rank-2 (notable) get 2 facts; rank-3 (faint/modern) get 1 fact.

export const CONSTELLATIONS = {
  And: {
    latin: 'Andromeda', english: 'The Chained Princess',
    brightest: 'Alpheratz (α And, mag 2.06)', area: '722 sq°', visible: 'Northern',
    mythology: 'Daughter of Cassiopeia, chained to a rock as sacrifice to the sea monster Cetus, rescued by Perseus.',
    facts: [
      'Contains the Andromeda Galaxy (M31), the most distant object visible to the naked eye at 2.54 million light-years',
      'M31 will collide with our Milky Way in ~4.5 billion years',
      'Home to the variable star R Andromedae and the binary system Almach'
    ]
  },
  Ant: {
    latin: 'Antlia', english: 'The Air Pump',
    brightest: 'α Antliae (mag 4.25)', area: '239 sq°', visible: 'Southern',
    facts: ['Modern constellation introduced by Lacaille in 1751, named after a vacuum air pump']
  },
  Aps: {
    latin: 'Apus', english: 'The Bird of Paradise',
    brightest: 'α Apodis (mag 3.83)', area: '206 sq°', visible: 'Far Southern',
    facts: ['Created in late 16th century by Dutch navigators, near the south celestial pole']
  },
  Aqr: {
    latin: 'Aquarius', english: 'The Water Bearer',
    brightest: 'Sadalsuud (β Aqr, mag 2.87)', area: '980 sq°', visible: 'Equatorial',
    mythology: 'In Greek myth, Ganymede — cup-bearer to Zeus, pouring nectar to the gods.',
    facts: [
      'Zodiacal constellation — Sun passes through 16 Feb – 11 March',
      'Contains the Helix Nebula (NGC 7293), the closest planetary nebula to Earth',
      'Trans-Neptunian object Eris was discovered here in 2005'
    ]
  },
  Aql: {
    latin: 'Aquila', english: 'The Eagle',
    brightest: 'Altair (α Aql, mag 0.76)', area: '652 sq°', visible: 'Equatorial',
    mythology: "Zeus's eagle, who carried his thunderbolts and also Ganymede to Olympus.",
    facts: [
      'Altair is one of the closest naked-eye stars at 16.7 light-years',
      'Part of the Summer Triangle with Vega (Lyra) and Deneb (Cygnus)',
      'Lies along the Milky Way — very rich in stars and dark nebulae'
    ]
  },
  Ara: {
    latin: 'Ara', english: 'The Altar',
    brightest: 'β Arae (mag 2.85)', area: '237 sq°', visible: 'Southern',
    facts: ['Greek altar where Zeus and other gods swore allegiance before battling the Titans']
  },
  Ari: {
    latin: 'Aries', english: 'The Ram',
    brightest: 'Hamal (α Ari, mag 2.00)', area: '441 sq°', visible: 'Northern',
    mythology: 'The Golden Fleece — ram that rescued Phrixus from sacrifice, sought later by Jason and the Argonauts.',
    facts: [
      'Zodiacal — Sun passes through 19 April – 14 May',
      'First sign of the zodiac in the Western tradition; vernal equinox was here ~2000 years ago (now in Pisces due to precession)',
      'Contains few bright stars but is historically and culturally significant'
    ]
  },
  Aur: {
    latin: 'Auriga', english: 'The Charioteer',
    brightest: 'Capella (α Aur, mag 0.08)', area: '657 sq°', visible: 'Northern',
    mythology: 'Erichthonius, mythical king of Athens who invented the four-horse chariot.',
    facts: [
      'Capella is the 6th brightest star in the sky — actually a system of 4 stars',
      'Contains three bright open clusters: M36, M37, M38',
      'Its pentagon shape is one of the easiest to find in winter skies'
    ]
  },
  Boo: {
    latin: 'Boötes', english: 'The Herdsman',
    brightest: 'Arcturus (α Boo, mag −0.05)', area: '907 sq°', visible: 'Northern',
    mythology: 'The herdsman driving the Great Bear (Ursa Major) around the celestial pole.',
    facts: [
      'Arcturus is the 4th brightest star in the sky and the brightest in the northern sky',
      'Arcturus is a giant star 25× the size of the Sun, 170× more luminous',
      'Contains the Boötes Void — a giant nearly-empty region 330 million light-years across'
    ]
  },
  Cae: {
    latin: 'Caelum', english: 'The Chisel',
    brightest: 'α Caeli (mag 4.45)', area: '125 sq°', visible: 'Southern',
    facts: ['One of the smallest constellations; introduced by Lacaille in the 1750s']
  },
  Cam: {
    latin: 'Camelopardalis', english: 'The Giraffe',
    brightest: 'β Camelopardalis (mag 4.03)', area: '757 sq°', visible: 'Far Northern',
    facts: [
      'Large but very faint — has no stars brighter than magnitude 4',
      'Despite being near the celestial pole, was not catalogued by Ptolemy'
    ]
  },
  Cnc: {
    latin: 'Cancer', english: 'The Crab',
    brightest: 'β Cancri (mag 3.50)', area: '506 sq°', visible: 'Northern',
    mythology: 'Crab sent by Hera to attack Hercules during his fight with the Hydra; crushed underfoot.',
    facts: [
      'Zodiacal — Sun passes through 21 July – 10 August',
      'Contains the Beehive Cluster (M44), one of the closest open clusters to Earth (~610 ly)',
      'Faintest of the zodiac constellations'
    ]
  },
  CVn: {
    latin: 'Canes Venatici', english: 'The Hunting Dogs',
    brightest: 'Cor Caroli (α CVn, mag 2.89)', area: '465 sq°', visible: 'Northern',
    facts: [
      'Represents Boötes\'s hunting dogs',
      'Contains the Whirlpool Galaxy (M51), the first galaxy in which spiral structure was identified (1845)'
    ]
  },
  CMa: {
    latin: 'Canis Major', english: 'The Greater Dog',
    brightest: 'Sirius (α CMa, mag −1.46)', area: '380 sq°', visible: 'Southern',
    mythology: 'One of Orion\'s hunting dogs.',
    facts: [
      'Sirius is the brightest star in the night sky — 8.6 light-years away',
      'Sirius is actually a binary: Sirius A (white main-sequence) + Sirius B (white dwarf)',
      'Ancient Egyptians timed their calendar by Sirius — its heliacal rising signaled the Nile flood'
    ]
  },
  CMi: {
    latin: 'Canis Minor', english: 'The Lesser Dog',
    brightest: 'Procyon (α CMi, mag 0.34)', area: '183 sq°', visible: 'Equatorial',
    facts: [
      'Procyon is the 8th brightest star in the night sky, 11.46 ly away',
      'Part of the Winter Triangle with Sirius and Betelgeuse'
    ]
  },
  Cap: {
    latin: 'Capricornus', english: 'The Sea Goat',
    brightest: 'Deneb Algedi (δ Cap, mag 2.81)', area: '414 sq°', visible: 'Southern',
    mythology: 'Pan turning himself into a sea-goat to escape the monster Typhon.',
    facts: [
      'Zodiacal — Sun passes through 20 January – 16 February',
      'One of the oldest recognised constellations; Babylonians knew it as "goat-fish"'
    ]
  },
  Car: {
    latin: 'Carina', english: 'The Keel (of the ship Argo)',
    brightest: 'Canopus (α Car, mag −0.74)', area: '494 sq°', visible: 'Southern',
    facts: [
      'Canopus is the 2nd brightest star in the night sky, 309 ly away',
      'Contains the Carina Nebula (NGC 3372), 7 600 ly away — one of the largest H II regions known',
      'Originally part of the now-defunct Argo Navis, split into Carina, Vela, and Puppis'
    ]
  },
  Cas: {
    latin: 'Cassiopeia', english: 'The Queen',
    brightest: 'Schedar (α Cas, mag 2.24)', area: '598 sq°', visible: 'Far Northern',
    mythology: 'Vain queen of Aethiopia, mother of Andromeda; placed upside-down in the sky as punishment.',
    facts: [
      'Distinctive "W" or "M" shape, depending on orientation — one of the easiest patterns to find',
      'Tycho Brahe\'s 1572 supernova (SN 1572) appeared in this constellation',
      'Always visible in the Northern Hemisphere — circumpolar above latitude 35°N'
    ]
  },
  Cen: {
    latin: 'Centaurus', english: 'The Centaur',
    brightest: 'Rigil Kentaurus / α Cen (mag −0.27)', area: '1 060 sq°', visible: 'Southern',
    mythology: 'Chiron, the wise centaur — teacher of Achilles, Jason, and Asclepius.',
    facts: [
      'α Centauri system contains Proxima Centauri — the closest star to the Sun at 4.24 ly',
      '9th-largest constellation by area',
      'Contains Omega Centauri (NGC 5139), the largest globular cluster in the Milky Way'
    ]
  },
  Cep: {
    latin: 'Cepheus', english: 'The King',
    brightest: 'Alderamin (α Cep, mag 2.51)', area: '588 sq°', visible: 'Far Northern',
    mythology: 'King of Aethiopia, husband of Cassiopeia, father of Andromeda.',
    facts: [
      'δ Cephei is the prototype of Cepheid variables — used to measure cosmic distances',
      'Will contain the north celestial pole around year 4000 due to precession'
    ]
  },
  Cet: {
    latin: 'Cetus', english: 'The Sea Monster (Whale)',
    brightest: 'Diphda (β Cet, mag 2.04)', area: '1 231 sq°', visible: 'Equatorial',
    mythology: 'Sea monster sent by Poseidon to devour Andromeda; slain by Perseus.',
    facts: [
      '4th-largest constellation by area',
      'Mira (ο Ceti) is the prototype Mira variable — pulses from mag 3 to 10 over 332 days',
      'Contains numerous galaxies including M77'
    ]
  },
  Cha: {
    latin: 'Chamaeleon', english: 'The Chameleon',
    brightest: 'α Chamaeleontis (mag 4.05)', area: '132 sq°', visible: 'Far Southern',
    facts: ['Small far-southern constellation; named by Dutch navigators ~1597']
  },
  Cir: {
    latin: 'Circinus', english: 'The Compass (drafting tool)',
    brightest: 'α Circini (mag 3.18)', area: '93 sq°', visible: 'Southern',
    facts: ['One of the smallest constellations; introduced by Lacaille in 1751']
  },
  Col: {
    latin: 'Columba', english: 'The Dove',
    brightest: 'Phact (α Col, mag 2.65)', area: '270 sq°', visible: 'Southern',
    facts: ['Represents the dove that brought Noah news of dry land after the biblical flood']
  },
  Com: {
    latin: 'Coma Berenices', english: "Berenice's Hair",
    brightest: 'β Comae Berenices (mag 4.26)', area: '386 sq°', visible: 'Northern',
    facts: [
      'Named after Queen Berenice II of Egypt, who sacrificed her hair to ensure her husband\'s safe return',
      'Contains the Coma Cluster of galaxies (~1 000 galaxies, 320 million ly away)'
    ]
  },
  CrA: {
    latin: 'Corona Australis', english: 'The Southern Crown',
    brightest: 'α CrA / Meridiana (mag 4.11)', area: '128 sq°', visible: 'Southern',
    facts: ['Star-forming region with several reflection nebulae and young stars']
  },
  CrB: {
    latin: 'Corona Borealis', english: 'The Northern Crown',
    brightest: 'Alphecca (α CrB, mag 2.22)', area: '179 sq°', visible: 'Northern',
    facts: [
      'Distinctive semicircular arc of stars',
      'Mythologically: the crown given by Dionysus to Ariadne after her abandonment by Theseus'
    ]
  },
  Crv: {
    latin: 'Corvus', english: 'The Crow',
    brightest: 'Gienah (γ Crv, mag 2.59)', area: '184 sq°', visible: 'Southern',
    facts: ['Apollo\'s raven, sent to fetch water — punished and placed in the sky for being late']
  },
  Crt: {
    latin: 'Crater', english: 'The Cup',
    brightest: 'δ Crateris (mag 3.56)', area: '282 sq°', visible: 'Southern',
    facts: ['Cup of Apollo, related mythologically to the nearby Corvus and Hydra']
  },
  Cru: {
    latin: 'Crux', english: 'The Southern Cross',
    brightest: 'Acrux (α Cru, mag 0.77)', area: '68 sq°', visible: 'Far Southern',
    facts: [
      'Smallest constellation by area but very prominent',
      'Used for navigation in the Southern Hemisphere — points roughly to the south celestial pole',
      'Featured on the flags of Australia, New Zealand, Brazil, Papua New Guinea, and Samoa'
    ]
  },
  Cyg: {
    latin: 'Cygnus', english: 'The Swan',
    brightest: 'Deneb (α Cyg, mag 1.25)', area: '804 sq°', visible: 'Northern',
    mythology: 'Zeus disguised as a swan to seduce Leda, mother of Helen of Troy.',
    facts: [
      'Deneb is one of the most luminous stars known — 196 000× the Sun\'s output',
      'Part of the Summer Triangle (with Altair and Vega)',
      'Contains Cygnus X-1, one of the first identified black holes'
    ]
  },
  Del: {
    latin: 'Delphinus', english: 'The Dolphin',
    brightest: 'Rotanev (β Del, mag 3.63)', area: '189 sq°', visible: 'Northern',
    facts: ['Dolphin sent by Poseidon to find Amphitrite; rewarded with a place in the stars']
  },
  Dor: {
    latin: 'Dorado', english: 'The Dolphinfish / Swordfish',
    brightest: 'α Doradus (mag 3.30)', area: '179 sq°', visible: 'Far Southern',
    facts: ['Contains most of the Large Magellanic Cloud, a satellite galaxy of the Milky Way']
  },
  Dra: {
    latin: 'Draco', english: 'The Dragon',
    brightest: 'Eltanin (γ Dra, mag 2.23)', area: '1 083 sq°', visible: 'Far Northern',
    mythology: 'Ladon, dragon guarding the golden apples of the Hesperides; slain by Hercules.',
    facts: [
      '8th-largest constellation by area',
      'Thuban (α Dra) was the pole star ~3000 BC — built into the alignment of the Great Pyramid of Giza',
      'Contains the Cat\'s Eye Nebula (NGC 6543)'
    ]
  },
  Equ: {
    latin: 'Equuleus', english: 'The Little Horse',
    brightest: 'Kitalpha (α Equ, mag 3.92)', area: '72 sq°', visible: 'Northern',
    facts: ['2nd-smallest constellation; said to be the brother of Pegasus']
  },
  Eri: {
    latin: 'Eridanus', english: 'The River',
    brightest: 'Achernar (α Eri, mag 0.46)', area: '1 138 sq°', visible: 'Southern',
    facts: [
      '6th-largest constellation; the longest constellation in the sky',
      'Achernar is the 9th-brightest star; highly oblate due to fast rotation',
      'Named after the river into which Phaethon fell after losing control of the Sun\'s chariot'
    ]
  },
  For: {
    latin: 'Fornax', english: 'The Furnace',
    brightest: 'α Fornacis (mag 3.85)', area: '398 sq°', visible: 'Southern',
    facts: ['Contains the Fornax Galaxy Cluster and the Hubble Ultra-Deep Field']
  },
  Gem: {
    latin: 'Gemini', english: 'The Twins',
    brightest: 'Pollux (β Gem, mag 1.14)', area: '514 sq°', visible: 'Northern',
    mythology: 'Castor and Pollux — twin sons of Leda, half-brothers of Helen of Troy.',
    facts: [
      'Zodiacal — Sun passes through 21 June – 20 July',
      'Pollux is the closest giant star to Earth (33.78 ly) and has a confirmed exoplanet',
      'Geminid meteor shower (mid-December) radiates from this constellation'
    ]
  },
  Gru: {
    latin: 'Grus', english: 'The Crane',
    brightest: 'Alnair (α Gru, mag 1.74)', area: '366 sq°', visible: 'Southern',
    facts: ['Created in late 16th century by Dutch navigators']
  },
  Her: {
    latin: 'Hercules', english: 'The Strongman',
    brightest: 'Kornephoros (β Her, mag 2.81)', area: '1 225 sq°', visible: 'Northern',
    mythology: 'Greek hero who performed the Twelve Labors — son of Zeus and Alcmene.',
    facts: [
      '5th-largest constellation',
      'Contains the Great Hercules Cluster (M13), one of the most prominent globular clusters in the northern sky',
      'Arecibo radio message (1974) was beamed toward M13'
    ]
  },
  Hor: {
    latin: 'Horologium', english: 'The Pendulum Clock',
    brightest: 'α Horologii (mag 3.85)', area: '249 sq°', visible: 'Southern',
    facts: ['Modern constellation by Lacaille (1751-2), named after the pendulum clock']
  },
  Hya: {
    latin: 'Hydra', english: 'The Sea Serpent',
    brightest: 'Alphard (α Hya, mag 1.98)', area: '1 303 sq°', visible: 'Equatorial',
    mythology: 'The nine-headed serpent slain by Hercules as his Second Labor.',
    facts: [
      'Largest constellation in the sky by area',
      'Extends across more than a quarter of the celestial sphere in right ascension',
      'Contains the Southern Pinwheel Galaxy (M83) and the planetary nebula NGC 3242'
    ]
  },
  Hyi: {
    latin: 'Hydrus', english: 'The Small Water Snake (male)',
    brightest: 'β Hydri (mag 2.80)', area: '243 sq°', visible: 'Far Southern',
    facts: ['Different from Hydra; created by Dutch navigators in late 16th century']
  },
  Ind: {
    latin: 'Indus', english: 'The Indian (Native American)',
    brightest: 'α Indi (mag 3.11)', area: '294 sq°', visible: 'Southern',
    facts: ['Created in late 16th century by Dutch navigators']
  },
  Lac: {
    latin: 'Lacerta', english: 'The Lizard',
    brightest: 'α Lacertae (mag 3.78)', area: '201 sq°', visible: 'Northern',
    facts: ['Created by Hevelius in 1687 to fill space between Cygnus and Andromeda']
  },
  Leo: {
    latin: 'Leo', english: 'The Lion',
    brightest: 'Regulus (α Leo, mag 1.40)', area: '947 sq°', visible: 'Northern',
    mythology: 'Nemean Lion — first labor of Hercules, whose hide was impervious to all weapons.',
    facts: [
      'Zodiacal — Sun passes through 10 August – 16 September',
      'Distinctive "Sickle" asterism forms the head and mane of the lion',
      'Leonid meteor shower (mid-November) radiates from here'
    ]
  },
  LMi: {
    latin: 'Leo Minor', english: 'The Lesser Lion',
    brightest: '46 Leonis Minoris (mag 3.83)', area: '232 sq°', visible: 'Northern',
    facts: ['Created by Hevelius in 1687; faint and easily overlooked between Leo and Ursa Major']
  },
  Lep: {
    latin: 'Lepus', english: 'The Hare',
    brightest: 'Arneb (α Lep, mag 2.58)', area: '290 sq°', visible: 'Equatorial',
    facts: ['The hare that Orion hunts, situated south of his constellation']
  },
  Lib: {
    latin: 'Libra', english: 'The Scales',
    brightest: 'Zubeneschamali (β Lib, mag 2.61)', area: '538 sq°', visible: 'Equatorial',
    facts: [
      'Zodiacal — Sun passes through 31 October – 22 November',
      'Only zodiac sign that is an object, not a creature',
      'Originally part of Scorpius — the scales held by Astraea, goddess of justice'
    ]
  },
  Lup: {
    latin: 'Lupus', english: 'The Wolf',
    brightest: 'α Lupi (mag 2.30)', area: '334 sq°', visible: 'Southern',
    facts: ['SN 1006, the brightest stellar event in recorded history (mag −7.5), occurred here']
  },
  Lyn: {
    latin: 'Lynx', english: 'The Lynx',
    brightest: 'α Lyncis (mag 3.13)', area: '545 sq°', visible: 'Northern',
    facts: ['Created by Hevelius in 1687; he named it "Lynx" because only the lynx-eyed could see it']
  },
  Lyr: {
    latin: 'Lyra', english: 'The Lyre',
    brightest: 'Vega (α Lyr, mag 0.03)', area: '286 sq°', visible: 'Northern',
    mythology: 'Lyre of Orpheus, who charmed the underworld with his music.',
    facts: [
      'Vega is the 5th brightest star — 25 ly away',
      'Vega was the pole star ~12 000 BC and will be again ~14 000 AD due to precession',
      'Contains the Ring Nebula (M57), iconic planetary nebula'
    ]
  },
  Men: {
    latin: 'Mensa', english: 'The Table Mountain',
    brightest: 'α Mensae (mag 5.09)', area: '153 sq°', visible: 'Far Southern',
    facts: ['Only constellation named after a real geographical feature (Table Mountain, South Africa)']
  },
  Mic: {
    latin: 'Microscopium', english: 'The Microscope',
    brightest: 'γ Microscopii (mag 4.67)', area: '210 sq°', visible: 'Southern',
    facts: ['Modern constellation by Lacaille (1751); very faint']
  },
  Mon: {
    latin: 'Monoceros', english: 'The Unicorn',
    brightest: 'β Monocerotis (mag 3.74)', area: '482 sq°', visible: 'Equatorial',
    facts: ['Contains the Rosette Nebula (NGC 2237) and the Christmas Tree Cluster (NGC 2264)']
  },
  Mus: {
    latin: 'Musca', english: 'The Fly',
    brightest: 'α Muscae (mag 2.69)', area: '138 sq°', visible: 'Far Southern',
    facts: ['Created in late 16th century by Dutch navigators']
  },
  Nor: {
    latin: 'Norma', english: "The Carpenter's Level",
    brightest: 'γ Normae (mag 4.01)', area: '165 sq°', visible: 'Southern',
    facts: ['Modern constellation by Lacaille; lies in a rich part of the Milky Way']
  },
  Oct: {
    latin: 'Octans', english: 'The Octant',
    brightest: 'ν Octantis (mag 3.73)', area: '291 sq°', visible: 'Far Southern',
    facts: ['Contains the south celestial pole; its faint stars make southern navigation harder than northern']
  },
  Oph: {
    latin: 'Ophiuchus', english: 'The Serpent-Bearer',
    brightest: 'Rasalhague (α Oph, mag 2.08)', area: '948 sq°', visible: 'Equatorial',
    mythology: 'Asclepius, god of medicine — traditionally depicted holding a serpent.',
    facts: [
      'The "13th zodiac" — Sun passes through 29 November – 17 December but not counted as a zodiac sign',
      'Contains Barnard\'s Star, the closest single star to the Sun after the α Centauri system',
      'Kepler\'s 1604 supernova (SN 1604) appeared here — last supernova visible in the Milky Way'
    ]
  },
  Ori: {
    latin: 'Orion', english: 'The Hunter',
    brightest: 'Rigel (β Ori, mag 0.13)', area: '594 sq°', visible: 'Equatorial',
    mythology: 'Giant hunter, son of Poseidon; killed by Artemis, placed in sky with his dogs Canis Major and Canis Minor.',
    facts: [
      'Most recognised constellation — Orion\'s Belt is one of the most iconic asterisms',
      'Contains Betelgeuse (red supergiant, expected to go supernova within 100 000 years)',
      'Contains the Orion Nebula (M42) — closest major star-forming region to Earth (1 344 ly)'
    ]
  },
  Pav: {
    latin: 'Pavo', english: 'The Peacock',
    brightest: 'α Pavonis / Peacock (mag 1.94)', area: '378 sq°', visible: 'Far Southern',
    facts: ['Created in late 16th century by Dutch navigators']
  },
  Peg: {
    latin: 'Pegasus', english: 'The Winged Horse',
    brightest: 'Enif (ε Peg, mag 2.40)', area: '1 121 sq°', visible: 'Northern',
    mythology: 'Winged horse born from the blood of Medusa when Perseus killed her.',
    facts: [
      '7th-largest constellation',
      'The Great Square of Pegasus is a prominent autumn asterism',
      '51 Pegasi (here) hosts 51 Pegasi b — first exoplanet discovered around a Sun-like star (1995)'
    ]
  },
  Per: {
    latin: 'Perseus', english: 'The Hero',
    brightest: 'Mirfak (α Per, mag 1.79)', area: '615 sq°', visible: 'Northern',
    mythology: 'Hero who slew Medusa and rescued Andromeda from Cetus.',
    facts: [
      'Algol (β Per) is the prototype eclipsing binary — "Demon Star", brightness varies every 2.87 days',
      'Perseid meteor shower (mid-August) radiates from here — one of the most reliable annual showers',
      'Contains the Double Cluster (NGC 869 and NGC 884)'
    ]
  },
  Phe: {
    latin: 'Phoenix', english: 'The Firebird',
    brightest: 'Ankaa (α Phe, mag 2.40)', area: '469 sq°', visible: 'Southern',
    facts: ['Created in late 16th century by Dutch navigators; the mythological firebird']
  },
  Pic: {
    latin: 'Pictor', english: "The Painter's Easel",
    brightest: 'α Pictoris (mag 3.27)', area: '247 sq°', visible: 'Far Southern',
    facts: ['Contains β Pictoris — first star observed to have a circumstellar dust disk (1984)']
  },
  Psc: {
    latin: 'Pisces', english: 'The Fishes',
    brightest: 'η Piscium (mag 3.62)', area: '889 sq°', visible: 'Equatorial',
    mythology: 'Aphrodite and her son Eros transformed themselves into fish to escape Typhon.',
    facts: [
      'Zodiacal — Sun passes through 12 March – 18 April',
      'Currently contains the vernal equinox point (point where Sun crosses celestial equator northward)',
      'Faint — no stars brighter than magnitude 3.5'
    ]
  },
  PsA: {
    latin: 'Piscis Austrinus', english: 'The Southern Fish',
    brightest: 'Fomalhaut (α PsA, mag 1.16)', area: '245 sq°', visible: 'Southern',
    facts: [
      'Fomalhaut is the 18th brightest star, with a famous dust disk and a possible planet (Fomalhaut b)',
      'The fish into which Aphrodite transformed to escape Typhon'
    ]
  },
  Pup: {
    latin: 'Puppis', english: 'The Stern (of the ship Argo)',
    brightest: 'Naos (ζ Pup, mag 2.21)', area: '673 sq°', visible: 'Southern',
    facts: [
      'Originally part of Argo Navis; split into Carina, Vela, Puppis',
      'Naos is one of the most luminous stars known — 813 000× brighter than the Sun'
    ]
  },
  Pyx: {
    latin: 'Pyxis', english: "The Ship's Compass",
    brightest: 'α Pyxidis (mag 3.68)', area: '221 sq°', visible: 'Southern',
    facts: ['Originally part of the Argo Navis; introduced by Lacaille']
  },
  Ret: {
    latin: 'Reticulum', english: 'The Reticle',
    brightest: 'α Reticuli (mag 3.33)', area: '114 sq°', visible: 'Far Southern',
    facts: ['Modern constellation by Lacaille (1751-2)']
  },
  Sge: {
    latin: 'Sagitta', english: 'The Arrow',
    brightest: 'γ Sagittae (mag 3.51)', area: '80 sq°', visible: 'Northern',
    facts: ['3rd-smallest constellation; mythologically various arrows (of Hercules, Eros, Apollo)']
  },
  Sgr: {
    latin: 'Sagittarius', english: 'The Archer',
    brightest: 'Kaus Australis (ε Sgr, mag 1.79)', area: '867 sq°', visible: 'Southern',
    mythology: 'Centaur archer — sometimes identified with Chiron, sometimes with the satyr Crotus.',
    facts: [
      'Zodiacal — Sun passes through 18 December – 19 January',
      'Contains the galactic center (Sagittarius A*) — the supermassive black hole at the heart of the Milky Way',
      'Distinctive "Teapot" asterism; steam from the spout points to the galactic center'
    ]
  },
  Sco: {
    latin: 'Scorpius', english: 'The Scorpion',
    brightest: 'Antares (α Sco, mag 0.91)', area: '497 sq°', visible: 'Southern',
    mythology: 'The scorpion sent by Gaia to kill Orion; placed opposite him in the sky so they never appear together.',
    facts: [
      'Antares ("rival of Mars") is a red supergiant, ~700× the Sun\'s radius',
      'Zodiacal but Sun spends only ~7 days here (22 – 29 November)',
      'Distinctive J-shaped curve forming the scorpion\'s body and stinger'
    ]
  },
  Scl: {
    latin: 'Sculptor', english: "The Sculptor's Studio",
    brightest: 'α Sculptoris (mag 4.30)', area: '475 sq°', visible: 'Southern',
    facts: [
      'Contains the south galactic pole — looking directly away from the Milky Way disk',
      'Home to the Sculptor Galaxy Group, a nearby galaxy cluster'
    ]
  },
  Sct: {
    latin: 'Scutum', english: 'The Shield',
    brightest: 'α Scuti (mag 3.85)', area: '109 sq°', visible: 'Equatorial',
    facts: [
      'Originally "Scutum Sobiescianum" — Shield of Sobieski, named for King John III of Poland by Hevelius',
      'Contains the Wild Duck Cluster (M11), a rich open cluster'
    ]
  },
  Ser: {
    latin: 'Serpens', english: 'The Serpent',
    brightest: 'Unukalhai (α Ser, mag 2.63)', area: '637 sq°', visible: 'Equatorial',
    facts: [
      'Only constellation split into two non-contiguous parts: Serpens Caput (head) and Serpens Cauda (tail)',
      'The serpent held by Ophiuchus the serpent-bearer',
      'Contains the Eagle Nebula (M16) with the famous "Pillars of Creation"'
    ]
  },
  Sex: {
    latin: 'Sextans', english: 'The Sextant',
    brightest: 'α Sextantis (mag 4.49)', area: '314 sq°', visible: 'Equatorial',
    facts: ['Created by Hevelius (1687); named after the sextant he used for stellar observations']
  },
  Tau: {
    latin: 'Taurus', english: 'The Bull',
    brightest: 'Aldebaran (α Tau, mag 0.85)', area: '797 sq°', visible: 'Northern',
    mythology: 'Zeus disguised himself as a white bull to abduct the princess Europa.',
    facts: [
      'Zodiacal — Sun passes through 14 May – 21 June',
      'Contains the Pleiades (M45) and the Hyades — two of the most famous open clusters',
      'Crab Nebula (M1) is the remnant of SN 1054, observed by Chinese astronomers'
    ]
  },
  Tel: {
    latin: 'Telescopium', english: 'The Telescope',
    brightest: 'α Telescopii (mag 3.51)', area: '252 sq°', visible: 'Southern',
    facts: ['Modern constellation by Lacaille (1751-2)']
  },
  Tri: {
    latin: 'Triangulum', english: 'The Triangle',
    brightest: 'β Trianguli (mag 3.00)', area: '132 sq°', visible: 'Northern',
    facts: ['Contains the Triangulum Galaxy (M33), 3rd-largest member of our Local Group of galaxies']
  },
  TrA: {
    latin: 'Triangulum Australe', english: 'The Southern Triangle',
    brightest: 'Atria (α TrA, mag 1.91)', area: '110 sq°', visible: 'Southern',
    facts: ['More prominent than the northern Triangulum; created by Dutch navigators']
  },
  Tuc: {
    latin: 'Tucana', english: 'The Toucan',
    brightest: 'α Tucanae (mag 2.86)', area: '295 sq°', visible: 'Far Southern',
    facts: [
      'Contains most of the Small Magellanic Cloud, our second-closest galactic neighbor',
      'Also contains 47 Tucanae (NGC 104), the 2nd-brightest globular cluster after Omega Centauri'
    ]
  },
  UMa: {
    latin: 'Ursa Major', english: 'The Great Bear',
    brightest: 'Alioth (ε UMa, mag 1.77)', area: '1 280 sq°', visible: 'Far Northern',
    mythology: 'Callisto, nymph beloved by Zeus, transformed into a bear by jealous Hera.',
    facts: [
      '3rd-largest constellation by area',
      'Contains the Big Dipper / Plough — the most recognised asterism in the world',
      'Mizar and Alcor (middle of Big Dipper handle) are a famous naked-eye double',
      'Two stars of the Big Dipper point to Polaris in Ursa Minor'
    ]
  },
  UMi: {
    latin: 'Ursa Minor', english: 'The Little Bear / Little Dipper',
    brightest: 'Polaris (α UMi, mag 1.98)', area: '256 sq°', visible: 'Far Northern',
    facts: [
      'Polaris (North Star) sits within 1° of the north celestial pole',
      'Used for navigation in the Northern Hemisphere for millennia',
      'Polaris is a Cepheid variable, varying slightly in brightness'
    ]
  },
  Vel: {
    latin: 'Vela', english: 'The Sails (of the ship Argo)',
    brightest: 'γ Velorum (mag 1.83)', area: '500 sq°', visible: 'Southern',
    facts: [
      'Originally part of Argo Navis',
      'Contains the Vela Supernova Remnant — a pulsar from a supernova ~12 000 years ago'
    ]
  },
  Vir: {
    latin: 'Virgo', english: 'The Virgin',
    brightest: 'Spica (α Vir, mag 0.97)', area: '1 294 sq°', visible: 'Equatorial',
    mythology: 'Various Greek goddesses (Astraea — goddess of justice; Demeter — agriculture; or Persephone).',
    facts: [
      '2nd-largest constellation by area',
      'Zodiacal — Sun passes through 16 September – 30 October',
      'Contains the Virgo Cluster of galaxies (~2 000 galaxies, 54 million ly away)'
    ]
  },
  Vol: {
    latin: 'Volans', english: 'The Flying Fish',
    brightest: 'β Volantis (mag 3.77)', area: '141 sq°', visible: 'Far Southern',
    facts: ['Created in late 16th century by Dutch navigators']
  },
  Vul: {
    latin: 'Vulpecula', english: 'The Fox',
    brightest: 'Anser (α Vul, mag 4.40)', area: '268 sq°', visible: 'Northern',
    facts: [
      'Created by Hevelius (1687) as "Vulpecula et Anser" — Fox and Goose',
      'Contains the Dumbbell Nebula (M27), first planetary nebula ever discovered (Messier, 1764)'
    ]
  }
};

// Format a multi-line card for a constellation, matching the planet info-card style.
export function formatConstellationCard(id) {
  const c = CONSTELLATIONS[id];
  if (!c) {
    return `<div class="ic-header"><strong>${id}</strong></div>
            <div class="ic-body"><em>Unknown constellation.</em></div>`;
  }
  const rows = [];
  const row = (label, value) => {
    if (value === undefined || value === null) return;
    rows.push(`<div class="ic-row"><span>${label}</span><strong>${value}</strong></div>`);
  };
  row('Latin', c.latin);
  row('Meaning', c.english);
  row('Brightest', c.brightest);
  row('Area', c.area);
  if (c.visible) row('Visible', c.visible);

  let mythHtml = '';
  if (c.mythology) {
    mythHtml = `
      <div class="ic-section">Mythology</div>
      <p style="margin: 6px 0 0; font-size: 0.74rem; color: #cbd5e1; line-height: 1.45;">${c.mythology}</p>`;
  }

  let factsHtml = '';
  if (c.facts && c.facts.length) {
    factsHtml = `
      <div class="ic-section">Did you know</div>
      <ul class="ic-facts">${c.facts.map((f) => `<li>${f}</li>`).join('')}</ul>`;
  }

  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(c.latin)}_(constellation)`;
  const wikiHtml = `<a class="ic-wiki" href="${wikiUrl}" target="_blank" rel="noopener">Wikipedia ↗</a>`;

  return `
    <div class="ic-header"><strong>${c.latin}</strong></div>
    <div class="ic-body">${rows.join('')}</div>
    ${mythHtml}
    ${factsHtml}
    ${wikiHtml}
  `;
}
