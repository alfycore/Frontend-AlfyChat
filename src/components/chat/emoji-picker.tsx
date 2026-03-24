'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Button, InputGroup, Popover, ScrollShadow } from '@heroui/react';
import { Twemoji, emojiToTwemojiUrl } from '@/lib/twemoji';
import { HugeiconsIcon } from '@hugeicons/react';
import { SmileIcon } from '@/components/icons';

// ==========================================
// EMOJI DATA — Version étendue
// ==========================================

const EMOJI_CATEGORIES: { name: string; icon: string; emojis: string[] }[] = [
  {
    name: 'Populaires',
    icon: '⭐',
    emojis: [
      '👍', '❤️', '😂', '😍', '🔥', '👀', '💯', '🎉', '✅', '😅',
      '🙏', '😊', '🤣', '😭', '😎', '🥺', '💀', '🤔', '👏', '💪',
      '🫡', '🥰', '😤', '🤡', '💅', '🫶', '😈', '🤝', '🙃', '✨',
    ],
  },
  {
    name: 'Visages',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫',
      '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒',
      '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
      '🤕', '🤢', '🤮', '🥴', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸',
      '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯',
      '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢',
      '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤',
      '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹',
      '👺', '👻', '👽', '👾', '🤖', '🫢', '🫨', '🫩', '😶‍🌫️', '🫠',
      '🫣', '🫧', '🫗', '🪬', '🫙',
    ],
  },
  {
    name: 'Gestes',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌',
      '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉',
      '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛',
      '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
      '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🫦', '👃', '🧠',
      '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫃', '🫄',
    ],
  },
  {
    name: 'Personnes',
    icon: '🧑',
    emojis: [
      '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓',
      '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋', '🧏', '🙇',
      '🤦', '🤷', '👮', '🕵️', '💂', '🥷', '👷', '🫅', '🤴', '👸',
      '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅',
      '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟',
      '🧌', '💆', '💇', '🚶', '🧍', '🧎', '🏃', '💃', '🕺', '👯',
    ],
  },
  {
    name: 'Animaux',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨',
      '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊',
      '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉',
      '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌',
      '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂',
      '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀',
      '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆',
      '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒',
      '🦘', '🦫', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙',
      '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓',
    ],
  },
  {
    name: 'Nature',
    icon: '🌿',
    emojis: [
      '🌵', '🎄', '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀',
      '🎍', '🪴', '🎋', '🍃', '🍂', '🍁', '🪺', '🪹', '🍄', '🌾',
      '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌻', '🌼', '🪻', '🪷',
      '🌞', '☀️', '🌤️', '⛅', '🌥️', '🌦️', '🌧️', '⛈️', '🌩️', '❄️',
      '🌨️', '🌪️', '🌈', '⭐', '🌟', '💫', '✨', '☄️', '🌙', '🌛',
      '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔',
    ],
  },
  {
    name: 'Nourriture',
    icon: '🍕',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
      '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑',
      '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅',
      '🥔', '🍠', '🫘', '🥐', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳',
      '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔',
      '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗',
      '🥘', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤',
      '🍚', '🍙', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨',
      '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍩',
      '🍪', '🥜', '🌰', '🍯', '🥛', '☕', '🍵', '🫖', '🧃', '🥤',
      '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉',
    ],
  },
  {
    name: 'Activités',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
      '🪁', '🛝', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼',
      '🛷', '⛸️', '🏂', '🎿', '🏋️', '🤸', '🤺', '⛹️', '🤾', '🏌️',
      '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆',
      '🥇', '🥈', '🥉', '🏅', '🎖️', '🎗️', '🎪', '🎭', '🩰', '🎨',
      '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗',
      '🎸', '🎻', '🪕', '🎲', '♟️', '🧩', '🎯', '🎳', '🎮', '🕹️',
    ],
  },
  {
    name: 'Voyage',
    icon: '🚗',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛺', '🚍',
      '🚔', '🚘', '🚖', '🛞', '🚡', '🚆', '🚇', '🚈', '🚉', '🚊',
      '🚝', '🚞', '🚋', '🛤️', '✈️', '🛫', '🛬', '🛩️', '💺', '🚁',
      '🛸', '🚀', '🛰️', '🛶', '⛵', '🚤', '🛥️', '🛳️', '🚢', '⚓',
      '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪',
      '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌',
      '🛕', '⛩️', '🕍', '🗺️', '🌍', '🌎', '🌏', '🧭', '⛰️', '🏔️',
    ],
  },
  {
    name: 'Objets',
    icon: '💡',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️',
      '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥',
      '📽️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️',
      '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '📡', '🔋', '🔌', '💡',
      '🔦', '🕯️', '🧯', '🗑️', '🛢️', '💰', '💴', '💵', '💶', '💷',
      '🪙', '💳', '💎', '⚖️', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️',
      '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧲', '🔫', '💣', '🪓', '🗡️',
      '⚔️', '🛡️', '🔒', '🔓', '🔑', '🗝️', '📝', '✏️', '🖊️', '📌',
    ],
  },
  {
    name: 'Symboles',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
      '⭐', '🌟', '💫', '✨', '⚡', '🔥', '💥', '☄️', '🎯', '💯',
      '⚠️', '♻️', '✅', '❌', '❓', '❗', '‼️', '⁉️', '💤', '💢',
      '💬', '👁️‍🗨️', '🗯️', '💭', '🔔', '🔕', '🎵', '🎶', '🏳️',
      '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '☢️', '☣️', '⚛️', '🔯', '♾️',
      '♠️', '♥️', '♦️', '♣️', '🃏', '🀄', '🎴', '🔇', '🔈', '🔉',
      '🔊', '📢', '📣', '⬆️', '⬇️', '⬅️', '➡️', '↗️', '↘️',
      '↙️', '↖️', '↕️', '↔️', '🔄', '🔃', '🔙', '🔚', '🔛', '🔜',
      '🔝', '⏩', '⏪', '⏫', '⏬', '▶️', '◀️', '🔀', '🔁', '🔂',
      '⏸️', '⏹️', '⏺️', '⏭️', '⏮️', '🔅', '🔆', '📶', '📳', '📴',
      '⚕️', '♿', '🚮', '🚰', '🚹', '🚺', '🚻', '🚼', '🛗', '🚾',
      '⚜️', '🔰', '⭕', '✳️', '❇️', '🔱', '📛', '🟠', '🟡', '🟢',
      '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨', '🟩', '🟦',
      '🟪', '🟫', '⬛', '⬜', '◾', '◽', '🔶', '🔷', '🔸', '🔹',
      '🔺', '🔻', '💠', '🔘', '🔳', '🔲', '©️', '®️', '™️',
    ],
  },
  {
    name: 'Drapeaux',
    icon: '🏁',
    emojis: [
      '🇫🇷', '🇺🇸', '🇬🇧', '🇩🇪', '🇪🇸', '🇮🇹', '🇧🇷', '🇯🇵', '🇰🇷', '🇨🇳',
      '🇷🇺', '🇮🇳', '🇨🇦', '🇦🇺', '🇲🇽', '🇵🇹', '🇧🇪', '🇨🇭', '🇳🇱', '🇸🇪',
      '🇳🇴', '🇩🇰', '🇫🇮', '🇵🇱', '🇦🇹', '🇮🇪', '🇹🇷', '🇬🇷', '🇿🇦', '🇪🇬',
      '🇸🇦', '🇦🇪', '🇮🇱', '🇦🇷', '🇨🇴', '🇻🇪', '🇨🇱', '🇵🇪', '🇳🇬', '🇰🇪',
      '🇲🇦', '🇹🇳', '🇩🇿', '🇵🇭', '🇹🇭', '🇻🇳', '🇮🇩', '🇲🇾', '🇸🇬', '🇳🇿',
    ],
  },
];

// ==========================================
// FRENCH SEARCH NAMES — comprehensive for every emoji
// ==========================================

const EMOJI_SEARCH_NAMES: Record<string, string> = {
  // Populaires
  '👍': 'pouce haut like bien ok top super',
  '❤️': 'coeur rouge amour love',
  '😂': 'rire larmes mort de rire mdr lol',
  '😍': 'yeux coeurs amoureux love',
  '🔥': 'feu fire flamme chaud brulant',
  '👀': 'yeux regard regarde voir',
  '💯': 'cent parfait score maximum',
  '🎉': 'fete celebration tada party confetti',
  '✅': 'check valide valider ok coche vert',
  '😅': 'gene sueur genant nerveux sourire',
  '🙏': 'prier merci svp please mains jointes',
  '😊': 'sourire heureux content genial',
  '🤣': 'rouler rire explosif ptdr mdr',
  '😭': 'pleurer triste larmes sanglot',
  '😎': 'cool lunettes soleil classe',
  '🥺': 'triste supplie attendri pitie mignon',
  '💀': 'mort crane skull dead squelette',
  '🤔': 'penser reflechir hmm question',
  '👏': 'applaudir bravo clap felicitations',
  '💪': 'muscle fort bras force biceps',
  '🫡': 'salut militaire respect honneur',
  '🥰': 'amour coeurs sourire affection',
  '😤': 'enerve fumer colere angry frustre',
  '🤡': 'clown circus ridicule bouffon',
  '💅': 'ongles vernis sassy fabuleux manucure',
  '🫶': 'coeur mains amour tendresse',
  '😈': 'diable demon mechant malin',
  '🤝': 'poignee main accord deal serrer',
  '🙃': 'sourire inverse ironique sarcastique',
  '✨': 'etincelles briller magie sparkle etoiles',
  // Visages
  '😀': 'sourire content grin',
  '😃': 'sourire yeux ouverts joyeux',
  '😄': 'sourire grand content ravi',
  '😁': 'sourire grimace dents',
  '😆': 'rire plisse yeux fermes haha',
  '🙂': 'sourire leger poli',
  '😉': 'clin oeil wink complice',
  '😇': 'ange innocent aureole',
  '🤩': 'star etoile yeux impressionne wow',
  '😘': 'bisou coeur kiss baiser',
  '😗': 'bisou moue',
  '😚': 'bisou yeux fermes',
  '😙': 'bisou sourire',
  '🥲': 'sourire larme emu triste content',
  '😋': 'miam delicieux langue gouter',
  '😛': 'langue tirer narguer',
  '😜': 'clin oeil langue espiegle',
  '🤪': 'fou dingue crazy zinzin',
  '😝': 'langue yeux fermes blague',
  '🤑': 'argent dollar riche money',
  '🤗': 'calin hug embrasser accueil',
  '🤭': 'oops rire cache main bouche',
  '🤫': 'chut silence secret bouche',
  '🤐': 'bouche ferme zip fermee',
  '🤨': 'sourcil leve doute sceptique',
  '😐': 'neutre indifferent plat',
  '😑': 'ennui blase yeux plisses',
  '😶': 'sans bouche silence muet',
  '🫥': 'invisible pointille disparaitre',
  '😏': 'sourire narquois malicieux coquin',
  '😒': 'irrite agace desapprouve bof',
  '🙄': 'yeux ciel exaspere pfff',
  '😬': 'grimace genant aie cringe',
  '🤥': 'menteur pinocchio mensonge',
  '😌': 'soulage paisible serein calme',
  '😔': 'triste pensif decu melancolie',
  '😪': 'somnolent fatigue dodo endormi',
  '🤤': 'bave gourmand envie delicieux',
  '😴': 'dormir dodo sommeil zzz',
  '😷': 'masque malade covid grippe',
  '🤒': 'malade thermometre fievre',
  '🤕': 'blesse bandage tete mal',
  '🤢': 'nauseeux vert malade degoutant',
  '🤮': 'vomir malade degoutant beurk',
  '🥴': 'ivre saoul bizarre woozy',
  '😵': 'etourdi assomme knock out',
  '😵‍💫': 'tete tourne vertige spirale',
  '🤯': 'esprit explose choc mind blown',
  '🤠': 'cowboy western chapeau yeehaw',
  '🥳': 'fete party celebrer chapeau',
  '🥸': 'deguise incognito lunettes moustache',
  '🤓': 'nerd geek intello lunettes',
  '🧐': 'monocle inspecteur curieux examine',
  '😕': 'confus perplexe perdu',
  '🫤': 'bouche diagonal doute',
  '😟': 'inquiet soucieux preoccupe',
  '🙁': 'triste mecontent decu',
  '☹️': 'triste decu visage long',
  '😮': 'bouche ouverte surpris oh',
  '😯': 'etonne surpris silencieux',
  '😲': 'choque stupefait bouche ouverte',
  '😳': 'rouge gene surprise rougir',
  '🥹': 'emu retenir larmes touchant',
  '😦': 'inquiet bouche ouverte',
  '😧': 'angoisse panique',
  '😨': 'peur effrayé terrifie',
  '😰': 'anxieux sueur froide stress',
  '😥': 'triste soulage decu',
  '😢': 'pleurer larme triste',
  '😱': 'cri horreur peur terreur',
  '😖': 'confus perplexe trouble',
  '😣': 'perseverant determine endure',
  '😞': 'decu desappointe triste',
  '😓': 'sueur froide difficile',
  '😩': 'fatigue epuise las',
  '😫': 'epuise fatigue excede',
  '🥱': 'bailler fatigue ennui sommeil',
  '😡': 'rage furieux rouge colere',
  '😠': 'en colere fache angry',
  '🤬': 'juron insulte censure colere',
  '👿': 'diable furieux demon mechant',
  '☠️': 'crane os mort danger pirate',
  '💩': 'caca crotte poop merde',
  '👹': 'ogre monstre demon japonais',
  '👺': 'tengu masque monstre',
  '👻': 'fantome ghost boo halloween',
  '👽': 'alien extraterrestre ovni',
  '👾': 'monstre jeu video space invaders',
  '🤖': 'robot machine ia android',
  '🫢': 'oops surprise main bouche yeux ouverts',
  '🫨': 'secoue tremble vibration',
  '🫩': 'visage legerement sourcil',
  '😶‍🌫️': 'nuage brouillard cache invisible',
  '🫠': 'fondre liquide chaleur',
  '🫣': 'regarder entre doigts timide',
  '🫧': 'bulles savon leger',
  '🫗': 'verser liquide vider',
  '🪬': 'main fatma hamsa protection',
  '🫙': 'bocal pot verre conserve',
  // Gestes
  '👋': 'salut coucou au revoir main',
  '🤚': 'main levee stop paume',
  '🖐️': 'main ouverte cinq doigts',
  '✋': 'stop main levee arreter',
  '🖖': 'vulcain spock star trek',
  '🫱': 'main droite vers droite',
  '🫲': 'main gauche vers gauche',
  '🫳': 'main vers bas paume bas',
  '🫴': 'main vers haut paume haut',
  '👌': 'ok parfait bien ca va',
  '🤌': 'italien pince rassemblement doigts',
  '🤏': 'pincer petit peu minuscule',
  '✌️': 'victoire paix peace deux doigts',
  '🤞': 'croiser doigts chance espoir',
  '🫰': 'coeur doigts index pouce',
  '🤟': 'je t aime langue des signes amour',
  '🤘': 'rock metal cornes',
  '🤙': 'telephone main appeler shaka',
  '👈': 'pointer gauche index',
  '👉': 'pointer droite index',
  '👆': 'pointer haut index',
  '🖕': 'doigt milieu vulgaire insulte',
  '👇': 'pointer bas index',
  '☝️': 'index leve attention numero un',
  '🫵': 'pointer vers vous toi',
  '👎': 'pouce bas dislike pas bien nul',
  '✊': 'poing leve force solidarite',
  '👊': 'poing frappe punch coup',
  '🤛': 'poing gauche fist bump',
  '🤜': 'poing droit fist bump',
  '🙌': 'mains levees celebration hourra',
  '👐': 'mains ouvertes accueil',
  '🤲': 'paumes vers haut recevoir prier',
  '✍️': 'ecrire stylo main',
  '🤳': 'selfie telephone photo',
  '🦾': 'bras mecanique prothese robot',
  '🦿': 'jambe mecanique prothese',
  '🦵': 'jambe cuisse',
  '🦶': 'pied orteil',
  '👂': 'oreille ecouter entendre',
  '🫦': 'levre mordre seduire',
  '👃': 'nez sentir odeur',
  '🧠': 'cerveau intelligence reflechir smart',
  '🫀': 'coeur anatomique organe',
  '🫁': 'poumons respirer organe',
  '🦷': 'dent dentiste machoire',
  '🦴': 'os squelette anatomie',
  '👁️': 'oeil regarder voir',
  '👅': 'langue lecher gouter',
  '👄': 'bouche levres baiser bisou',
  '🫃': 'homme enceinte',
  '🫄': 'personne enceinte',
  // Personnes
  '👶': 'bebe baby nourrisson petit',
  '🧒': 'enfant kid gamin',
  '👦': 'garcon boy jeune',
  '👧': 'fille girl jeune',
  '🧑': 'personne adulte',
  '👱': 'blond cheveux personne',
  '👨': 'homme man monsieur',
  '🧔': 'barbu barbe homme',
  '👩': 'femme woman madame',
  '🧓': 'personne agee vieux senior',
  '👴': 'vieil homme grand-pere papy',
  '👵': 'vieille femme grand-mere mamie',
  '🙍': 'froncer sourcils mecontent',
  '🙎': 'moue bouder',
  '🙅': 'non refuser croiser bras',
  '🙆': 'ok accepter bras cercle',
  '💁': 'information aide desk accueil',
  '🙋': 'lever main question repondre',
  '🧏': 'sourd sourde oreille',
  '🙇': 'saluer incliner respect',
  '🤦': 'facepalm desespoir erreur betise',
  '🤷': 'haussement epaules bof sais pas',
  '👮': 'policier police flic',
  '🕵️': 'detective inspecteur enqueteur spy',
  '💂': 'garde royal soldat sentinelle',
  '🥷': 'ninja assassin furtif',
  '👷': 'ouvrier construction chantier casque',
  '🫅': 'roi couronne monarque',
  '🤴': 'prince royal',
  '👸': 'princesse royal couronne',
  '👳': 'turban oriental coiffure',
  '👲': 'chapeau chinois asiatique',
  '🧕': 'hijab foulard voile femme',
  '🤵': 'costume mariage marie smoking',
  '👰': 'mariee voile mariage',
  '🤰': 'enceinte grossesse bebe',
  '🤱': 'allaiter bebe mere',
  '👼': 'ange bebe cherubin',
  '🎅': 'pere noel santa christmas',
  '🤶': 'mere noel christmas santa',
  '🦸': 'super heros hero cape',
  '🦹': 'super vilain villain mechant',
  '🧙': 'mage sorcier magicien wizard',
  '🧚': 'fee fairy magic ailes',
  '🧛': 'vampire dracula sang',
  '🧜': 'sirene mermaid ocean',
  '🧝': 'elfe elf seigneur anneaux',
  '🧞': 'genie djinn lampe voeu',
  '🧟': 'zombie mort vivant',
  '🧌': 'troll monstre creature',
  '💆': 'massage detente spa',
  '💇': 'coiffure coupe cheveux',
  '🚶': 'marcher pieton promenade',
  '🧍': 'debout attendre',
  '🧎': 'genoux agenouille',
  '🏃': 'courir sprint course jogging',
  '💃': 'danseuse danse femme salsa',
  '🕺': 'danseur danse homme disco',
  '👯': 'bunny danse groupe',
  // Animaux
  '🐶': 'chien dog toutou',
  '🐱': 'chat cat miaou',
  '🐭': 'souris mouse petit',
  '🐹': 'hamster rongeur mignon',
  '🐰': 'lapin rabbit',
  '🦊': 'renard fox ruse',
  '🐻': 'ours bear',
  '🐼': 'panda bambou',
  '🐻‍❄️': 'ours polaire blanc arctique',
  '🐨': 'koala australie',
  '🐯': 'tigre tiger',
  '🦁': 'lion roi safari',
  '🐮': 'vache cow meuh',
  '🐷': 'cochon pig oink',
  '🐽': 'groin cochon nez',
  '🐸': 'grenouille frog ribbit',
  '🐵': 'singe monkey',
  '🙈': 'singe yeux caches pas voir',
  '🙉': 'singe oreilles pas entendre',
  '🙊': 'singe bouche pas parler',
  '🐒': 'singe monkey primate',
  '🐔': 'poule poulet chicken',
  '🐧': 'pingouin manchot penguin',
  '🐦': 'oiseau bird',
  '🐤': 'poussin bird bebe',
  '🐣': 'poussin eclos oeuf',
  '🐥': 'poussin petit oiseau',
  '🦆': 'canard duck coin',
  '🦅': 'aigle eagle rapace',
  '🦉': 'hibou chouette owl',
  '🦇': 'chauve-souris bat halloween',
  '🐺': 'loup wolf',
  '🐗': 'sanglier boar',
  '🐴': 'cheval horse equitation',
  '🦄': 'licorne unicorn magique',
  '🐝': 'abeille bee miel',
  '🪱': 'ver vers worm',
  '🐛': 'chenille bug insecte',
  '🦋': 'papillon butterfly',
  '🐌': 'escargot snail lent',
  '🐞': 'coccinelle ladybug',
  '🐜': 'fourmi ant',
  '🪰': 'mouche fly insecte',
  '🪲': 'scarabee beetle',
  '🪳': 'cafard cockroach',
  '🦟': 'moustique mosquito',
  '🦗': 'grillon cricket',
  '🕷️': 'araignee spider',
  '🕸️': 'toile araignee web',
  '🦂': 'scorpion arachnide',
  '🐢': 'tortue turtle lent',
  '🐍': 'serpent snake',
  '🦎': 'lezard lizard',
  '🦖': 'dinosaure t-rex',
  '🦕': 'dinosaure brachiosaure long cou',
  '🐙': 'pieuvre octopus tentacules',
  '🦑': 'calamar squid',
  '🦐': 'crevette shrimp',
  '🦞': 'homard lobster',
  '🦀': 'crabe crab',
  '🐡': 'poisson globe fugu',
  '🐠': 'poisson tropical',
  '🐟': 'poisson fish',
  '🐬': 'dauphin dolphin',
  '🐳': 'baleine whale jet eau',
  '🐋': 'baleine whale grande',
  '🦈': 'requin shark',
  '🐊': 'crocodile croco alligator',
  '🐅': 'tigre tiger rayures',
  '🐆': 'leopard guepard taches',
  '🦓': 'zebre zebra rayures',
  '🦍': 'gorille gorilla singe',
  '🦧': 'orang-outan singe orange',
  '🦣': 'mammouth prehistorique',
  '🐘': 'elephant trompe',
  '🦛': 'hippopotame hippo',
  '🦏': 'rhinoceros rhino corne',
  '🐪': 'chameau dromadaire une bosse',
  '🐫': 'chameau deux bosses',
  '🦒': 'girafe longue cou taches',
  '🦘': 'kangourou australie bondir',
  '🦫': 'castor beaver barrage',
  '🐃': 'buffle buffalo',
  '🐂': 'boeuf taureau',
  '🐄': 'vache cow lait',
  '🐎': 'cheval course galop',
  '🐖': 'cochon pig',
  '🐏': 'belier ram mouton',
  '🐑': 'mouton sheep laine',
  '🦙': 'lama alpaga',
  '🐐': 'chevre goat',
  '🦌': 'cerf biche deer',
  '🐕': 'chien dog animal',
  '🐩': 'caniche poodle chien',
  '🦮': 'chien guide aveugle',
  '🐕‍🦺': 'chien service assistance',
  '🐈': 'chat cat',
  '🐈‍⬛': 'chat noir black cat',
  '🪶': 'plume feather ecrire',
  '🐓': 'coq rooster chante',
  // Nature
  '🌵': 'cactus desert piquant',
  '🎄': 'sapin noel christmas',
  '🌲': 'sapin arbre conifere',
  '🌳': 'arbre feuillu chene',
  '🌴': 'palmier tropical plage',
  '🪵': 'bois buche tronc',
  '🌱': 'pousse germination plante',
  '🌿': 'feuille herbe verte plante',
  '☘️': 'trefle irlande',
  '🍀': 'trefle quatre feuilles chance',
  '🎍': 'bambou pin decoration japonais',
  '🪴': 'plante pot interieur',
  '🎋': 'tanabata japonais arbre voeu',
  '🍃': 'feuilles vent souffle',
  '🍂': 'feuilles automne tombees',
  '🍁': 'erable automne canada rouge',
  '🪺': 'nid oeufs oiseau',
  '🪹': 'nid vide oiseau',
  '🍄': 'champignon mushroom',
  '🌾': 'ble riz epi cereale',
  '💐': 'bouquet fleurs cadeau',
  '🌷': 'tulipe fleur hollande',
  '🌹': 'rose rouge fleur amour',
  '🥀': 'rose fanee morte triste',
  '🌺': 'hibiscus fleur tropicale',
  '🌸': 'cerisier fleur sakura japon',
  '🌻': 'tournesol fleur jaune soleil',
  '🌼': 'marguerite fleur',
  '🪻': 'jacinthe fleur violette',
  '🪷': 'lotus fleur zen',
  '🌞': 'soleil visage content',
  '☀️': 'soleil briller chaud ete',
  '🌤️': 'soleil nuage degage',
  '⛅': 'nuage soleil couvert partiel',
  '🌥️': 'nuage soleil cache',
  '🌦️': 'pluie soleil averses',
  '🌧️': 'pluie nuage pluvieux',
  '⛈️': 'orage eclair tonnerre',
  '🌩️': 'eclair orage foudre',
  '❄️': 'neige flocon froid hiver',
  '🌨️': 'neige chute hiver',
  '🌪️': 'tornade tempete cyclone',
  '🌈': 'arc en ciel rainbow couleurs',
  '⭐': 'etoile star jaune',
  '🌟': 'etoile briller scintiller',
  '💫': 'etoile etourdi',
  '☄️': 'comete meteorite etoile filante',
  '🌙': 'lune croissant nuit',
  '🌛': 'lune premier quartier visage',
  '🌜': 'lune dernier quartier visage',
  '🌚': 'lune nouvelle visage sombre',
  '🌕': 'pleine lune',
  '🌖': 'lune gibbeuse decroissante',
  '🌗': 'lune dernier quartier',
  '🌘': 'lune decroissante',
  '🌑': 'nouvelle lune sombre',
  '🌒': 'lune croissante premier',
  '🌓': 'lune premier quartier',
  '🌔': 'lune gibbeuse croissante',
  // Nourriture
  '🍏': 'pomme verte fruit',
  '🍎': 'pomme rouge fruit',
  '🍐': 'poire fruit',
  '🍊': 'orange mandarine fruit',
  '🍋': 'citron jaune acide',
  '🍌': 'banane fruit jaune',
  '🍉': 'pasteque melon eau ete',
  '🍇': 'raisin grape vin',
  '🍓': 'fraise strawberry fruit rouge',
  '🫐': 'myrtille blueberry',
  '🍈': 'melon fruit',
  '🍒': 'cerise cherry fruit rouge',
  '🍑': 'peche peach fruit',
  '🥭': 'mangue mango fruit tropical',
  '🍍': 'ananas pineapple tropical',
  '🥥': 'noix coco coconut',
  '🥝': 'kiwi fruit vert',
  '🍅': 'tomate tomato rouge',
  '🍆': 'aubergine eggplant violet',
  '🥑': 'avocat avocado vert',
  '🥦': 'brocoli legume vert',
  '🥬': 'laitue salade feuille',
  '🥒': 'concombre cucumber',
  '🌶️': 'piment chili piquant epice',
  '🫑': 'poivron pepper',
  '🌽': 'mais corn epi',
  '🥕': 'carotte carrot orange',
  '🫒': 'olive vert',
  '🧄': 'ail garlic',
  '🧅': 'oignon onion',
  '🥔': 'patate pomme de terre potato',
  '🍠': 'patate douce sweet potato',
  '🫘': 'haricot bean',
  '🥐': 'croissant viennoiserie petit-dejeuner',
  '🍞': 'pain bread',
  '🥖': 'baguette pain francais',
  '🥨': 'bretzel pretzel',
  '🧀': 'fromage cheese',
  '🥚': 'oeuf egg',
  '🍳': 'oeuf plat frire cuisine',
  '🧈': 'beurre butter',
  '🥞': 'pancake crepe petit-dejeuner',
  '🧇': 'gaufre waffle',
  '🥓': 'bacon lard',
  '🥩': 'steak viande meat',
  '🍗': 'poulet cuisse chicken',
  '🍖': 'viande os cote',
  '🌭': 'hot-dog saucisse',
  '🍔': 'hamburger burger fast-food',
  '🍟': 'frites french fries',
  '🍕': 'pizza fromage pepperoni',
  '🫓': 'pain plat flatbread',
  '🥪': 'sandwich pain jambon',
  '🥙': 'kebab pita falafel',
  '🧆': 'falafel boulette',
  '🌮': 'taco mexicain',
  '🌯': 'burrito mexicain wrap',
  '🫔': 'tamale mexicain mais',
  '🥗': 'salade bol legumes',
  '🥘': 'paella poele plat mijote',
  '🫕': 'fondue fromage suisse',
  '🍝': 'spaghetti pates pasta italien',
  '🍜': 'ramen nouilles soupe japonais',
  '🍲': 'pot feu soupe ragout',
  '🍛': 'curry riz epice indien',
  '🍣': 'sushi japonais poisson riz',
  '🍱': 'bento boite repas japonais',
  '🥟': 'ravioli dumpling gyoza',
  '🍤': 'crevette tempura frit',
  '🍚': 'riz rice bol',
  '🍙': 'onigiri riz japonais',
  '🍘': 'galette riz crackers',
  '🍥': 'naruto poisson gateau',
  '🥠': 'fortune cookie biscuit',
  '🥮': 'gateau lune mooncake',
  '🍢': 'brochette oden japonais',
  '🍡': 'dango mochi japonais',
  '🍧': 'glace rasee sorbet',
  '🍨': 'glace sundae dessert',
  '🍦': 'glace cone cornet',
  '🥧': 'tarte pie dessert',
  '🧁': 'cupcake gateau petit',
  '🍰': 'gateau part shortcake',
  '🎂': 'gateau anniversaire birthday',
  '🍮': 'flan pudding creme caramel',
  '🍭': 'sucette lollipop bonbon',
  '🍬': 'bonbon candy sucre',
  '🍫': 'chocolat barre cacao',
  '🍩': 'donut beignet',
  '🍪': 'cookie biscuit gateau',
  '🥜': 'cacahuete peanut arachide',
  '🌰': 'chataigne noisette noix',
  '🍯': 'miel honey pot abeille',
  '🥛': 'lait milk verre',
  '☕': 'cafe coffee tasse',
  '🍵': 'the tea tasse vert',
  '🫖': 'theiere tea pot',
  '🧃': 'jus brick boite',
  '🥤': 'soda boisson paille gobelet',
  '🧋': 'bubble tea boba',
  '🍶': 'sake japonais alcool',
  '🍺': 'biere beer chope mousse',
  '🍻': 'bieres trinquer cheers',
  '🥂': 'champagne toast trinquer celebration',
  '🍷': 'vin rouge verre alcool',
  '🥃': 'whisky whiskey verre alcool',
  '🍸': 'cocktail martini olive alcool',
  '🍹': 'cocktail tropical boisson',
  '🧉': 'mate yerba boisson',
  // Activités
  '⚽': 'football soccer ballon',
  '🏀': 'basketball basket ballon',
  '🏈': 'football americain rugby',
  '⚾': 'baseball balle',
  '🥎': 'softball balle',
  '🎾': 'tennis balle raquette',
  '🏐': 'volleyball volley ballon',
  '🏉': 'rugby ballon ovale',
  '🥏': 'frisbee disc',
  '🎱': 'billard pool 8 boule',
  '🪀': 'yoyo jouet',
  '🏓': 'ping-pong tennis de table',
  '🏸': 'badminton volant raquette',
  '🏒': 'hockey glace crosse',
  '🏑': 'hockey gazon crosse',
  '🥍': 'lacrosse crosse',
  '🏏': 'cricket batte',
  '🪃': 'boomerang lancer',
  '🥅': 'but goal cage filet',
  '⛳': 'golf drapeau trou',
  '🪁': 'cerf-volant kite vent',
  '🛝': 'toboggan slide parc',
  '🏹': 'arc fleche tir archery',
  '🎣': 'peche fishing canne poisson',
  '🤿': 'plongee masque snorkel',
  '🥊': 'boxe gant combat',
  '🥋': 'arts martiaux judo karate',
  '🎽': 'maillot course sport',
  '🛹': 'skateboard skate',
  '🛼': 'patin roulettes roller',
  '🛷': 'luge sled neige',
  '⛸️': 'patin glace ice skating',
  '🏂': 'snowboard neige',
  '🎿': 'ski neige montagne',
  '🏋️': 'halterophilie musculation poids',
  '🤸': 'acrobatie gymnastique roue',
  '🤺': 'escrime epee combat',
  '⛹️': 'basket dribble ballon',
  '🤾': 'handball lancer',
  '🏌️': 'golf swing club',
  '🏇': 'course cheval equitation jockey',
  '🧘': 'yoga meditation zen',
  '🏄': 'surf vague planche ocean',
  '🏊': 'nager natation piscine',
  '🤽': 'water-polo piscine',
  '🚣': 'aviron rame bateau',
  '🧗': 'escalade grimper',
  '🚵': 'vtt velo montagne',
  '🚴': 'cyclisme velo course',
  '🏆': 'trophee gagnant champion coupe',
  '🥇': 'medaille or premier gagnant',
  '🥈': 'medaille argent deuxieme',
  '🥉': 'medaille bronze troisieme',
  '🏅': 'medaille sport',
  '🎖️': 'medaille militaire ruban',
  '🎗️': 'ruban sensibilisation',
  '🎪': 'cirque chapiteau spectacle',
  '🎭': 'theatre masques comedie tragedie',
  '🩰': 'ballet danse chausson',
  '🎨': 'peinture art palette couleurs',
  '🎬': 'cinema film clap action',
  '🎤': 'micro microphone chanter karaoke',
  '🎧': 'casque ecouteur musique',
  '🎼': 'partition musique notes',
  '🎹': 'piano clavier musique',
  '🥁': 'tambour batterie drum',
  '🪘': 'djembe tambour africain',
  '🎷': 'saxophone jazz musique',
  '🎺': 'trompette brass musique',
  '🪗': 'accordeon musique',
  '🎸': 'guitare guitar rock',
  '🎻': 'violon violin classique',
  '🪕': 'banjo country musique',
  '🎲': 'de jeu hasard chance',
  '♟️': 'echecs pion chess strategie',
  '🧩': 'puzzle piece jeu',
  '🎯': 'cible dart bullseye viser',
  '🎳': 'bowling quilles boule',
  '🎮': 'manette jeux video gaming',
  '🕹️': 'joystick arcade jeu retro',
  // Voyage
  '🚗': 'voiture car rouge',
  '🚕': 'taxi jaune voiture',
  '🚙': 'suv 4x4 voiture',
  '🚌': 'bus autobus transport',
  '🚎': 'trolleybus bus electrique',
  '🏎️': 'formule 1 course voiture rapide',
  '🚓': 'police voiture sirene',
  '🚑': 'ambulance urgence hopital',
  '🚒': 'pompier camion incendie',
  '🚐': 'minibus van transport',
  '🛻': 'pickup camionnette',
  '🚚': 'camion livraison',
  '🚛': 'semi-remorque camion',
  '🚜': 'tracteur agriculture ferme',
  '🏍️': 'moto motorcycle',
  '🛵': 'scooter vespa',
  '🚲': 'velo bicyclette',
  '🛴': 'trottinette scooter',
  '🛺': 'auto-rickshaw tuk tuk',
  '🚍': 'bus avant face',
  '🚔': 'police voiture face',
  '🚘': 'voiture face auto',
  '🚖': 'taxi face',
  '🛞': 'roue pneu',
  '🚡': 'teleferique telepherique montagne',
  '🚆': 'train locomotive rail',
  '🚇': 'metro subway underground',
  '🚈': 'metro leger tram',
  '🚉': 'gare station train',
  '🚊': 'tramway tram',
  '🚝': 'monorail train',
  '🚞': 'train montagne',
  '🚋': 'wagon tramway',
  '🛤️': 'rails chemin fer voie',
  '✈️': 'avion plane vol voyage',
  '🛫': 'avion decoller depart',
  '🛬': 'avion atterrir arrivee',
  '🛩️': 'avion petit prive',
  '💺': 'siege avion place',
  '🚁': 'helicoptere helico',
  '🛸': 'ovni soucoupe volante ufo alien',
  '🚀': 'fusee espace lancement rocket',
  '🛰️': 'satellite espace orbite',
  '🛶': 'canoe kayak rame',
  '⛵': 'voilier bateau vent mer',
  '🚤': 'bateau rapide speed boat',
  '🛥️': 'yacht bateau moteur',
  '🛳️': 'paquebot croisiere bateau',
  '🚢': 'navire cargo bateau',
  '⚓': 'ancre bateau port',
  '🏠': 'maison home',
  '🏡': 'maison jardin',
  '🏢': 'immeuble bureau building',
  '🏣': 'poste japonaise',
  '🏤': 'poste bureau courrier',
  '🏥': 'hopital sante medical',
  '🏦': 'banque money finance',
  '🏨': 'hotel hebergement nuit',
  '🏩': 'love hotel amour',
  '🏪': 'epicerie combini magasin',
  '🏫': 'ecole college lycee',
  '🏬': 'centre commercial magasin',
  '🏭': 'usine factory industrie',
  '🏯': 'chateau japonais',
  '🏰': 'chateau castle medieval',
  '💒': 'mariage eglise chapelle',
  '🗼': 'tour tokyo tower',
  '🗽': 'statue liberte new york usa',
  '⛪': 'eglise church religion',
  '🕌': 'mosquee islam priere',
  '🛕': 'temple hindou',
  '⛩️': 'torii japonais temple',
  '🕍': 'synagogue juif religion',
  '🗺️': 'carte monde map globe',
  '🌍': 'terre europe afrique globe',
  '🌎': 'terre amerique globe',
  '🌏': 'terre asie globe',
  '🧭': 'boussole compass direction',
  '⛰️': 'montagne mountain',
  '🏔️': 'montagne neige pic',
  // Objets
  '⌚': 'montre watch heure',
  '📱': 'telephone portable smartphone',
  '📲': 'mobile fleche telephone',
  '💻': 'ordinateur portable laptop',
  '⌨️': 'clavier keyboard',
  '🖥️': 'ordinateur bureau desktop ecran',
  '🖨️': 'imprimante printer',
  '🖱️': 'souris mouse clic',
  '🖲️': 'trackball boule',
  '🗜️': 'etau presse',
  '💽': 'disque mini disc',
  '💾': 'disquette floppy sauvegarder',
  '💿': 'cd compact disc musique',
  '📀': 'dvd disc video',
  '📼': 'cassette vhs video',
  '📷': 'appareil photo camera',
  '📸': 'appareil photo flash',
  '📹': 'camescope video camera',
  '🎥': 'camera cinema film',
  '📽️': 'projecteur film cinema',
  '📞': 'telephone combine',
  '☎️': 'telephone fixe retro',
  '📟': 'beeper pager',
  '📠': 'fax telecopieur',
  '📺': 'television tv ecran',
  '📻': 'radio musique',
  '🎙️': 'micro studio podcast',
  '🎚️': 'curseur volume slider',
  '🎛️': 'boutons controle',
  '⏱️': 'chronometre stopwatch',
  '⏲️': 'minuteur timer',
  '⏰': 'reveil alarm clock',
  '🕰️': 'pendule horloge manteau',
  '⌛': 'sablier hourglass temps',
  '📡': 'satellite antenne signal',
  '🔋': 'batterie pile charge',
  '🔌': 'prise electrique plug',
  '💡': 'ampoule idee lumiere',
  '🔦': 'lampe torche flashlight',
  '🕯️': 'bougie candle flamme',
  '🧯': 'extincteur feu securite',
  '🗑️': 'poubelle corbeille trash supprimer',
  '🛢️': 'baril bidon petrole',
  '💰': 'sac argent money dollars',
  '💴': 'billet yen japon',
  '💵': 'billet dollar usa',
  '💶': 'billet euro europe',
  '💷': 'billet livre sterling uk',
  '🪙': 'piece monnaie coin',
  '💳': 'carte credit bancaire',
  '💎': 'diamant gem bijou pierre',
  '⚖️': 'balance justice poids',
  '🧰': 'boite outils toolbox',
  '🪛': 'tournevis screwdriver',
  '🔧': 'cle anglaise wrench outil',
  '🔨': 'marteau hammer',
  '⚒️': 'marteau pioche',
  '🛠️': 'outils marteau cle',
  '⛏️': 'pioche pick mine',
  '🪚': 'scie saw bois',
  '🔩': 'ecrou vis bolt nut',
  '⚙️': 'engrenage gear parametres settings',
  '🪤': 'piege souris trap',
  '🧲': 'aimant magnet',
  '🔫': 'pistolet eau water gun',
  '💣': 'bombe explosion danger',
  '🪓': 'hache axe',
  '🗡️': 'dague epee couteau',
  '⚔️': 'epees croisees combat',
  '🛡️': 'bouclier shield protection',
  '🔒': 'cadenas ferme lock securite',
  '🔓': 'cadenas ouvert unlock',
  '🔑': 'cle key',
  '🗝️': 'cle ancienne old key',
  '📝': 'memo note ecrire',
  '✏️': 'crayon pencil ecrire',
  '🖊️': 'stylo pen ecrire',
  '📌': 'punaise pin epingle',
  // Symboles
  '🧡': 'coeur orange amour',
  '💛': 'coeur jaune amour',
  '💚': 'coeur vert amour',
  '💙': 'coeur bleu amour',
  '💜': 'coeur violet amour',
  '🖤': 'coeur noir dark amour',
  '🤍': 'coeur blanc amour',
  '🤎': 'coeur marron amour',
  '💔': 'coeur brise casse triste',
  '❤️‍🔥': 'coeur feu passion amour',
  '❤️‍🩹': 'coeur bandage guerison',
  '❣️': 'coeur exclamation amour',
  '💕': 'deux coeurs amour',
  '💞': 'coeurs tournent amour',
  '💓': 'coeur battant amour',
  '💗': 'coeur grandissant amour',
  '💖': 'coeur scintillant sparkle amour',
  '💘': 'coeur fleche cupidon amour',
  '💝': 'coeur ruban cadeau amour',
  '⚡': 'eclair electric foudre flash',
  '💥': 'boom explosion collision',
  '⚠️': 'attention danger warning',
  '♻️': 'recyclage ecologie vert',
  '❌': 'croix faux erreur non',
  '❓': 'question interrogation',
  '❗': 'exclamation attention important',
  '‼️': 'double exclamation urgent',
  '⁉️': 'exclamation question quoi',
  '💤': 'dormir sommeil zzz',
  '💢': 'colere enerve symbole',
  '💬': 'bulle parole message chat',
  '👁️‍🗨️': 'oeil bulle temoin',
  '🗯️': 'bulle colere rage',
  '💭': 'bulle pensee penser',
  '🔔': 'cloche notification bell',
  '🔕': 'cloche barree silencieux mute',
  '🎵': 'note musique',
  '🎶': 'notes musique chanson',
  '🏳️': 'drapeau blanc reddition',
  '🏴': 'drapeau noir pirate',
  '🏁': 'drapeau damier course arrivee finish',
  '🚩': 'drapeau rouge red flag danger',
  '🏳️‍🌈': 'drapeau arc-en-ciel pride lgbtq',
  '🏳️‍⚧️': 'drapeau transgenre trans pride',
  '☢️': 'radioactif nucleaire danger',
  '☣️': 'biohazard biologique danger',
  '⚛️': 'atome science physique',
  '🔯': 'etoile david hexagramme',
  '♾️': 'infini infinity eternel',
  '♠️': 'pique carte jeu',
  '♥️': 'coeur carte jeu',
  '♦️': 'carreau carte jeu',
  '♣️': 'trefle carte jeu',
  '🃏': 'joker carte jeu',
  '🀄': 'mahjong dragon rouge jeu',
  '🎴': 'hanafuda carte japonais jeu',
  '🔇': 'muet silence son coupe',
  '🔈': 'volume bas son',
  '🔉': 'volume moyen son',
  '🔊': 'volume fort son haut',
  '📢': 'megaphone annonce haut-parleur',
  '📣': 'megaphone fete',
  '⬆️': 'fleche haut up',
  '⬇️': 'fleche bas down',
  '⬅️': 'fleche gauche left',
  '➡️': 'fleche droite right',
  '↗️': 'fleche haut droite',
  '↘️': 'fleche bas droite',
  '↙️': 'fleche bas gauche',
  '↖️': 'fleche haut gauche',
  '↕️': 'fleche haut bas vertical',
  '↔️': 'fleche gauche droite horizontal',
  '🔄': 'rotation recharger refresh',
  '🔃': 'rotation sens horaire',
  '🔙': 'retour back',
  '🔚': 'fin end',
  '🔛': 'marche on actif',
  '🔜': 'bientot soon',
  '🔝': 'haut top',
  '🔅': 'luminosite faible dim',
  '🔆': 'luminosite forte bright',
  '📶': 'signal antenne reseau',
  '⚕️': 'medical sante croix',
  '♿': 'handicape fauteuil roulant',
  '⚜️': 'fleur lys royal',
  '🔰': 'debutant nouveau symbole japonais',
  '⭕': 'cercle rouge',
  '✳️': 'asterisque etoile croix',
  '❇️': 'etincelle sparkle',
  '🔱': 'trident embleme',
  '📛': 'badge nom',
  '🟠': 'cercle orange',
  '🟡': 'cercle jaune',
  '🟢': 'cercle vert',
  '🔵': 'cercle bleu',
  '🟣': 'cercle violet',
  '🟤': 'cercle marron',
  '⚫': 'cercle noir',
  '⚪': 'cercle blanc',
  '🟥': 'carre rouge',
  '🟧': 'carre orange',
  '🟨': 'carre jaune',
  '🟩': 'carre vert',
  '🟦': 'carre bleu',
  '🟪': 'carre violet',
  '🟫': 'carre marron',
  '©️': 'copyright droit auteur',
  '®️': 'marque deposee registered',
  '™️': 'trademark marque commerciale',
  // Drapeaux
  '🇫🇷': 'france francais drapeau french',
  '🇺🇸': 'etats-unis usa americain drapeau',
  '🇬🇧': 'royaume-uni angleterre british drapeau',
  '🇩🇪': 'allemagne german deutsch drapeau',
  '🇪🇸': 'espagne spain espagnol drapeau',
  '🇮🇹': 'italie italy italien drapeau',
  '🇧🇷': 'bresil brazil drapeau',
  '🇯🇵': 'japon japan japonais drapeau',
  '🇰🇷': 'coree sud korean drapeau',
  '🇨🇳': 'chine china chinois drapeau',
  '🇷🇺': 'russie russia russe drapeau',
  '🇮🇳': 'inde india indien drapeau',
  '🇨🇦': 'canada canadien drapeau erable',
  '🇦🇺': 'australie australia australien drapeau',
  '🇲🇽': 'mexique mexico mexicain drapeau',
  '🇵🇹': 'portugal portugais drapeau',
  '🇧🇪': 'belgique belgium belge drapeau',
  '🇨🇭': 'suisse switzerland drapeau',
  '🇳🇱': 'pays-bas hollande neerlandais drapeau',
  '🇸🇪': 'suede sweden suedois drapeau',
  '🇳🇴': 'norvege norway norvegien drapeau',
  '🇩🇰': 'danemark denmark danois drapeau',
  '🇫🇮': 'finlande finland finlandais drapeau',
  '🇵🇱': 'pologne poland polonais drapeau',
  '🇦🇹': 'autriche austria autrichien drapeau',
  '🇮🇪': 'irlande ireland irlandais drapeau',
  '🇹🇷': 'turquie turkey turc drapeau',
  '🇬🇷': 'grece greece grec drapeau',
  '🇿🇦': 'afrique du sud south africa drapeau',
  '🇪🇬': 'egypte egypt egyptien drapeau',
  '🇸🇦': 'arabie saoudite saudi drapeau',
  '🇦🇪': 'emirats arabes unis uae dubai drapeau',
  '🇮🇱': 'israel israelien drapeau',
  '🇦🇷': 'argentine argentina drapeau',
  '🇨🇴': 'colombie colombia drapeau',
  '🇻🇪': 'venezuela drapeau',
  '🇨🇱': 'chili chile drapeau',
  '🇵🇪': 'perou peru drapeau',
  '🇳🇬': 'nigeria drapeau',
  '🇰🇪': 'kenya drapeau',
  '🇲🇦': 'maroc morocco marocain drapeau',
  '🇹🇳': 'tunisie tunisia tunisien drapeau',
  '🇩🇿': 'algerie algeria algerien drapeau',
  '🇵🇭': 'philippines drapeau',
  '🇹🇭': 'thailande thailand drapeau',
  '🇻🇳': 'vietnam drapeau',
  '🇮🇩': 'indonesie indonesia drapeau',
  '🇲🇾': 'malaisie malaysia drapeau',
  '🇸🇬': 'singapour singapore drapeau',
  '🇳🇿': 'nouvelle-zelande new zealand drapeau',
};

// ==========================================
// CACHE SYSTEM
// ==========================================

const CACHE_KEY = 'alfychat_emoji_cache_v1';
const RECENT_KEY = 'alfychat_emoji_recent';
const MAX_RECENT = 24;

function getAllEmojis(): string[] {
  const set = new Set<string>();
  for (const cat of EMOJI_CATEGORIES) {
    for (const emoji of cat.emojis) {
      set.add(emoji);
    }
  }
  return Array.from(set);
}

function preloadEmojiImages(): void {
  if (typeof window === 'undefined') return;

  const cached = localStorage.getItem(CACHE_KEY);
  if (cached === 'done') return;

  console.log('[EMOJI] First connection — caching emoji images in background...');

  const allEmojis = getAllEmojis();
  let loaded = 0;
  let failed = 0;

  for (const emoji of allEmojis) {
    const img = new Image();
    img.src = emojiToTwemojiUrl(emoji);
    img.onload = () => {
      loaded++;
      if (loaded + failed >= allEmojis.length) {
        localStorage.setItem(CACHE_KEY, 'done');
        console.log(`[EMOJI] Cache complete: ${loaded} loaded, ${failed} failed`);
      }
    };
    img.onerror = () => {
      failed++;
      if (loaded + failed >= allEmojis.length) {
        localStorage.setItem(CACHE_KEY, 'done');
        console.log(`[EMOJI] Cache complete: ${loaded} loaded, ${failed} failed`);
      }
    };
  }
}

function getRecentEmojis(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(RECENT_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

function saveRecentEmoji(emoji: string): void {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentEmojis().filter((e) => e !== emoji);
    recent.unshift(emoji);
    if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch { /* ignore */ }
}

// ==========================================
// COMPONENT
// ==========================================

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  children?: React.ReactNode;
}

export function EmojiPicker({ onSelect, children }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(-1);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    preloadEmojiImages();
  }, []);

  useEffect(() => {
    if (open) {
      setRecentEmojis(getRecentEmojis());
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearch('');
      setActiveCategory(recentEmojis.length > 0 ? -1 : 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSelect = useCallback(
    (emoji: string) => {
      saveRecentEmoji(emoji);
      setRecentEmojis((prev) => {
        const next = prev.filter((e) => e !== emoji);
        next.unshift(emoji);
        if (next.length > MAX_RECENT) next.length = MAX_RECENT;
        return next;
      });
      onSelect(emoji);
      setOpen(false);
    },
    [onSelect],
  );

  const displayCategories = useMemo(() => {
    const cats: { name: string; icon: string; emojis: string[] }[] = [];

    if (recentEmojis.length > 0) {
      cats.push({ name: 'Récents', icon: '🕐', emojis: recentEmojis });
    }

    cats.push(...EMOJI_CATEGORIES);
    return cats;
  }, [recentEmojis]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return displayCategories;

    const q = search
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const results: string[] = [];
    const seen = new Set<string>();

    for (const cat of EMOJI_CATEGORIES) {
      for (const emoji of cat.emojis) {
        if (seen.has(emoji)) continue;

        if (emoji.includes(q)) {
          results.push(emoji);
          seen.add(emoji);
          continue;
        }

        const names = EMOJI_SEARCH_NAMES[emoji];
        if (names) {
          const normalized = names
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          if (normalized.includes(q)) {
            results.push(emoji);
            seen.add(emoji);
          }
        }
      }
    }

    if (results.length === 0) return [];
    return [{ name: 'Résultats', icon: '🔍', emojis: results }];
  }, [search, displayCategories]);

  const scrollToCategory = useCallback((index: number) => {
    setActiveCategory(index);
    const el = document.getElementById(`emoji-cat-${index}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const navCategories = useMemo(() => {
    const cats: { name: string; icon: string; catIndex: number }[] = [];
    if (recentEmojis.length > 0) {
      cats.push({ name: 'Récents', icon: '🕐', catIndex: 0 });
    }
    const offset = recentEmojis.length > 0 ? 1 : 0;
    EMOJI_CATEGORIES.forEach((cat, i) => {
      cats.push({ name: cat.name, icon: cat.icon, catIndex: i + offset });
    });
    return cats;
  }, [recentEmojis]);

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        {children || (
          <Button isIconOnly size="sm" variant="ghost">
            <HugeiconsIcon icon={SmileIcon} size={16} />
          </Button>
        )}
      </Popover.Trigger>
      <Popover.Content placement="top end" className="w-[340px] overflow-hidden rounded-2xl border border-[var(--border)]/30 bg-[var(--surface)]/98 p-0 shadow-2xl backdrop-blur-2xl sm:w-[380px]">
        {/* Search bar */}
        <div className="border-b border-[var(--border)]/20 px-3 pt-3 pb-2">
          <InputGroup className="h-9 rounded-xl border-[var(--border)]/40 bg-[var(--background)]/50 text-sm">
            <InputGroup.Input
              ref={searchInputRef}
              placeholder="Rechercher un emoji..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-3"
            />
          </InputGroup>
        </div>

        {/* Category tabs - horizontal at top */}
        {!search && (
          <div className="flex items-center gap-0.5 overflow-x-auto border-b border-[var(--border)]/20 px-2 py-1.5 scrollbar-none">
            {navCategories.map((cat) => (
              <button
                key={`nav-${cat.catIndex}`}
                type="button"
                className={`flex shrink-0 items-center justify-center rounded-lg p-1.5 transition-all duration-150 ${
                  activeCategory === cat.catIndex
                    ? 'bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/20'
                    : 'opacity-60 hover:opacity-100 hover:bg-[var(--surface-secondary)]/50'
                }`}
                onClick={() => scrollToCategory(cat.catIndex)}
                title={cat.name}
              >
                <Twemoji emoji={cat.icon} size={18} />
              </button>
            ))}
          </div>
        )}

        {/* Emoji grid */}
        <ScrollShadow className="h-[280px] sm:h-[320px]">
          <div className="px-2.5 py-2">
            {filteredCategories.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2">
                <span className="text-3xl">🔍</span>
                <p className="text-[13px] text-[var(--muted)]/60">
                  Aucun emoji trouvé
                </p>
              </div>
            ) : (
              filteredCategories.map((category, catIndex) => (
                <div key={`cat-${catIndex}-${category.name}`} id={`emoji-cat-${catIndex}`} className="mb-2">
                  <div className="sticky top-0 z-10 mb-1 bg-[var(--surface)]/95 py-1 backdrop-blur-md">
                    <p className="flex items-center gap-1.5 px-0.5 text-[11px] font-semibold text-[var(--muted)]/70">
                      {category.name}
                    </p>
                  </div>
                  <div className="grid grid-cols-8 gap-px sm:grid-cols-9">
                    {category.emojis.map((emoji, emojiIndex) => (
                      <button
                        key={`${catIndex}-${emojiIndex}`}
                        type="button"
                        className="group flex aspect-square items-center justify-center rounded-lg transition-all duration-100 hover:scale-[1.15] hover:bg-[var(--accent)]/10 active:scale-95"
                        onClick={() => handleSelect(emoji)}
                        title={EMOJI_SEARCH_NAMES[emoji]?.split(' ')[0] || emoji}
                      >
                        <Twemoji emoji={emoji} size={24} className="transition-transform group-hover:drop-shadow-sm" />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollShadow>
      </Popover.Content>
    </Popover>
  );
}
