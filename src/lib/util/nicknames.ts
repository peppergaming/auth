import { getRandomElement } from './index';

const names = [
  'Compubl',
  'Kavense',
  'Raend',
  'Synqueso',
  'Farse',
  'Vividek',
  'Toolstass',
  'Clamput',
  'Armfulex',
  'Antaciona',
  'WetSublime',
  'Orkscope',
  'KentrosSubject',
  'Mewor',
  'Boardida',
  'Moonetel',
  'Hydesing',
  'TagzYoung',
  'GambitSoccer',
  'LingInca',
  'IdealReady',
  'VampireMon',
  'Rpgho',
  'Storiesse',
  'PersonGree',
  'Goitivex',
  'Contrie',
  'Andovid',
  'SanLasting',
  'Mamast',
  'DravenMine',
  'FearSomber',
  'KittyNice',
  'Birkmak',
  'BugsNews',
  'Footley',
  'Cryptoptc',
  'DiscoverDelight',
  'Sk8rld',
  'GrabsKuro',
  'HelloShiya',
  'Semecard',
  'ParkPost',
  'Izoneop',
  'Aholicepik',
  'Radiismet',
  'Orburyot',
  'Hoodesca',
  'FamousXoxo',
  'Fishibit',
  'Puffiapl',
  'Theusetre',
  'Americions',
  'Crabedity',
  'GottaCute',
  'Intcatwoon',
  'Ndevronis',
  'Rodeone',
  'Maximu',
  'TightHippo',
  'Wirect',
  'Canalbian',
  'Traffre',
  'Giventes',
  'Strongest',
  'Puffen',
  'ShabbyTrauma',
  'Aholiche',
  'LatestFriend',
  'Keepereo',
  'Hurtingby',
  'Fratiali',
  'Toyst',
  'Verbagen',
  'Summerer',
  'Famousia',
  'Pridesman',
  'Contrie',
  'Sarchmal',
  'HelloGo',
  'Haularch',
  'Streldog',
  'TacticPure',
  'Bandtech',
  'Freexpo',
  'ParisBall',
  'MyKenka',
  'Packnig',
  'Bluesp',
  'KentrosKing',
  'Molaryva',
  'ExclusiveChirp',
  'Estervans',
  'RawWunder',
  'TalesTrump',
  '2cutepo',
  'LatinaBoot',
  'Thebena',
  'Simplynn',
  'Monophyol',
];

export const generateNickname = (
  prefix: string | null = null,
  suffix: string | null = null
) => {
  let name = getRandomElement(names);
  if (prefix) {
    name = `${prefix}_${name}`;
  }
  if (suffix) {
    name = `${name}#${suffix}`;
  }
  return name;
};
