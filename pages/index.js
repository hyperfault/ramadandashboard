import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & DATA
// ─────────────────────────────────────────────────────────────────────────────

const DHAKA = { lat: 23.8103, lng: 90.4125, tz: 'Asia/Dhaka', label: 'Dhaka, Bangladesh' };
const AUTH_USER = 'Muntasir';
const AUTH_HASH = '5cf97cdbc1bbfb92f5cb8a02ec694d8cc1fa7d78b381bd7ec76a6f50979feeec';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

const HIJRI_MONTHS = [
  'Muharram','Safar',"Rabi' al-Awwal","Rabi' al-Thani",
  'Jumada al-Ula','Jumada al-Akhirah','Rajab',"Sha'ban",
  'Ramadan','Shawwal',"Dhu al-Qi'dah",'Dhu al-Hijjah',
];

const PRAYER_ICONS = { Fajr:'*', Dhuhr:'*', Asr:'*', Maghrib:'*', Isha:'*' };

const AYAH_POOL = [
  { arabic:'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', translation:'Indeed, with hardship will be ease.', ref:'Al-Inshirah 94:6' },
  { arabic:'وَٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ', translation:'Seek help through patience and prayer.', ref:'Al-Baqarah 2:45' },
  { arabic:'فَٱذْكُرُونِىٓ أَذْكُرْكُمْ', translation:'Remember Me and I will remember you.', ref:'Al-Baqarah 2:152' },
  { arabic:'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', translation:'He is with you wherever you are.', ref:'Al-Hadid 57:4' },
  { arabic:'إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ', translation:'Indeed, Allah is with the patient.', ref:'Al-Baqarah 2:153' },
  { arabic:'وَلَا تَيْأَسُوا۟ مِن رَّوْحِ ٱللَّهِ', translation:'Do not despair of the mercy of Allah.', ref:'Yusuf 12:87' },
  { arabic:'حَسْبُنَا ٱللَّهُ وَنِعْمَ ٱلْوَكِيلُ', translation:'Allah is sufficient for us, and He is the best Disposer of affairs.', ref:'Al-Imran 3:173' },
  { arabic:'وَمَا تَوْفِيقِىٓ إِلَّا بِٱللَّهِ', translation:'My success is not but through Allah.', ref:'Hud 11:88' },
  { arabic:'كُلُّ نَفْسٍ ذَآئِقَةُ ٱلْمَوْتِ', translation:'Every soul shall taste death.', ref:'Al-Ankabut 29:57' },
  { arabic:'وَعَسَىٰٓ أَن تَكْرَهُوا۟ شَيْـًٔا وَهُوَ خَيْرٌ لَّكُمْ', translation:'Perhaps you dislike something and it is good for you.', ref:'Al-Baqarah 2:216' },
  { arabic:'شَهْرُ رَمَضَانَ ٱلَّذِىٓ أُنزِلَ فِيهِ ٱلْقُرْءَانُ', translation:'The month of Ramadan in which the Quran was revealed.', ref:'Al-Baqarah 2:185' },
  { arabic:'رَبَّنَآ ءَاتِنَا فِى ٱلدُّنْيَا حَسَنَةً وَفِى ٱلْءَاخِرَةِ حَسَنَةً', translation:'Our Lord, give us good in this world and good in the Hereafter.', ref:'Al-Baqarah 2:201' },
  { arabic:'إِنَّ ٱللَّهَ لَا يُضِيعُ أَجْرَ ٱلْمُحْسِنِينَ', translation:'Indeed, Allah does not allow the reward of good-doers to be lost.', ref:'At-Tawbah 9:120' },
  { arabic:'وَٱللَّهُ يَرْزُقُ مَن يَشَآءُ بِغَيْرِ حِسَابٍ', translation:'Allah provides for whom He wills without account.', ref:'Al-Baqarah 2:212' },
  { arabic:'لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا', translation:'Allah does not burden a soul beyond that it can bear.', ref:'Al-Baqarah 2:286' },
  { arabic:'وَبَشِّرِ ٱلصَّٰبِرِينَ', translation:'And give good tidings to the patient.', ref:'Al-Baqarah 2:155' },
  { arabic:'إِنَّمَآ أَمْرُهُۥٓ إِذَآ أَرَادَ شَيْـًٔا أَن يَقُولَ لَهُۥ كُن فَيَكُونُ', translation:'His command is only that when He wills a thing, He says "Be," and it is.', ref:'Ya-Sin 36:82' },
  { arabic:'وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥٓ', translation:'Whoever relies upon Allah -- He is sufficient for him.', ref:'At-Talaq 65:3' },
  { arabic:'وَٱعْلَمُوٓا۟ أَنَّ ٱللَّهَ مَعَ ٱلْمُتَّقِينَ', translation:'Know that Allah is with those who fear Him.', ref:'Al-Baqarah 2:194' },
  { arabic:'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', translation:'For indeed, with hardship will be ease.', ref:'Al-Inshirah 94:5' },
];

const DUAS = [
  { title: 'Entering the Home', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلَجِ وَخَيْرَ الْمَخْرَجِ', translation: 'O Allah, I ask You for the good of entering and the good of leaving.' },
  { title: 'Before Eating', arabic: 'بِسْمِ اللَّهِ وَعَلَى بَرَكَةِ اللَّهِ', translation: 'In the name of Allah and with His blessings.' },
  { title: 'After Eating', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', translation: 'Praise be to Allah who fed us, gave us drink, and made us Muslims.' },
  { title: 'Before Sleeping', arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', translation: 'In Your name, O Allah, I die and I live.' },
  { title: 'Upon Waking', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', translation: 'Praise be to Allah who gave us life after death and to Him is the resurrection.' },
  { title: 'When Anxious', arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ', translation: 'Allah is sufficient for me. There is no god but Him. In Him I put my trust.' },
  { title: 'For Parents', arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا', translation: 'My Lord, have mercy on them as they raised me when I was small.' },
  { title: 'Istighfar', arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ', translation: 'I seek forgiveness of Allah the Almighty, besides whom there is no god, the Ever-Living, the Self-Subsisting.' },
  { title: 'For Guidance', arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', translation: 'Guide us to the straight path.' },
  { title: 'Morning Dhikr', arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ', translation: 'We have entered the morning and the dominion belongs to Allah, and all praise is due to Allah.' },
];


const RABBANA_DUAS = [
  { title: 'Rabbana 1', ref: 'Al-Baqarah 2:127', arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ', translation: 'Our Lord, accept from us. Indeed You are the Hearing, the Knowing.' },
  { title: 'Rabbana 2', ref: 'Al-Baqarah 2:128', arabic: 'رَبَّنَا وَاجْعَلْنَا مُسْلِمَيْنِ لَكَ وَمِن ذُرِّيَّتِنَا أُمَّةً مُّسْلِمَةً لَّكَ', translation: 'Our Lord, make us Muslims submitting to You, and from our descendants a Muslim nation submitting to You.' },
  { title: 'Rabbana 3', ref: 'Al-Baqarah 2:201', arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', translation: 'Our Lord, give us good in this world and good in the Hereafter and protect us from the punishment of the Fire.' },
  { title: 'Rabbana 4', ref: 'Al-Baqarah 2:250', arabic: 'رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ', translation: 'Our Lord, pour upon us patience and plant firmly our feet and give us victory over the disbelieving people.' },
  { title: 'Rabbana 5', ref: 'Al-Baqarah 2:286', arabic: 'رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا', translation: 'Our Lord, do not impose blame upon us if we forget or make error.' },
  { title: 'Rabbana 6', ref: 'Al-Baqarah 2:286', arabic: 'رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا', translation: 'Our Lord, do not burden us as You burdened those before us.' },
  { title: 'Rabbana 7', ref: 'Al-Baqarah 2:286', arabic: 'رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا', translation: 'Our Lord, do not burden us with that which we have no ability to bear. Pardon us, forgive us, and have mercy upon us.' },
  { title: 'Rabbana 8', ref: 'Al-Imran 3:8', arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً', translation: 'Our Lord, do not let our hearts deviate after You have guided us and grant us from Yourself mercy.' },
  { title: 'Rabbana 9', ref: 'Al-Imran 3:9', arabic: 'رَبَّنَا إِنَّكَ جَامِعُ النَّاسِ لِيَوْمٍ لَّا رَيْبَ فِيهِ إِنَّ اللَّهَ لَا يُخْلِفُ الْمِيعَادَ', translation: 'Our Lord, surely You will gather the people for a Day about which there is no doubt. Indeed, Allah does not fail in His promise.' },
  { title: 'Rabbana 10', ref: 'Al-Imran 3:16', arabic: 'رَبَّنَا إِنَّنَا آمَنَّا فَاغْفِرْ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ النَّارِ', translation: 'Our Lord, indeed we have believed, so forgive us our sins and protect us from the punishment of the Fire.' },
  { title: 'Rabbana 11', ref: 'Al-Imran 3:53', arabic: 'رَبَّنَا آمَنَّا بِمَا أَنزَلْتَ وَاتَّبَعْنَا الرَّسُولَ فَاكْتُبْنَا مَعَ الشَّاهِدِينَ', translation: 'Our Lord, we have believed in what You revealed and have followed the messenger, so register us among the witnesses.' },
  { title: 'Rabbana 12', ref: 'Al-Imran 3:147', arabic: 'رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ', translation: 'Our Lord, forgive us our sins and our excess in our affairs, and plant firmly our feet and give us victory over the disbelieving people.' },
  { title: 'Rabbana 13', ref: 'Al-Imran 3:191', arabic: 'رَبَّنَا مَا خَلَقْتَ هَذَا بَاطِلًا سُبْحَانَكَ فَقِنَا عَذَابَ النَّارِ', translation: 'Our Lord, You did not create this without purpose; glory be to You! So protect us from the punishment of the Fire.' },
  { title: 'Rabbana 14', ref: 'Al-Imran 3:192', arabic: 'رَبَّنَا إِنَّكَ مَن تُدْخِلِ النَّارَ فَقَدْ أَخْزَيْتَهُ وَمَا لِلظَّالِمِينَ مِنْ أَنصَارٍ', translation: 'Our Lord, indeed whoever You admit to the Fire, You have disgraced him, and for wrongdoers there are no helpers.' },
  { title: 'Rabbana 15', ref: 'Al-Imran 3:193', arabic: 'رَبَّنَا إِنَّنَا سَمِعْنَا مُنَادِيًا يُنَادِي لِلْإِيمَانِ أَنْ آمِنُوا بِرَبِّكُمْ فَآمَنَّا', translation: 'Our Lord, indeed we have heard a caller calling to faith, saying: Believe in your Lord, and we have believed.' },
  { title: 'Rabbana 16', ref: 'Al-Imran 3:194', arabic: 'رَبَّنَا وَآتِنَا مَا وَعَدتَّنَا عَلَى رُسُلِكَ وَلَا تُخْزِنَا يَوْمَ الْقِيَامَةِ', translation: 'Our Lord, grant us what You promised us through Your messengers and do not disgrace us on the Day of Resurrection.' },
  { title: 'Rabbana 17', ref: 'An-Nisa 4:75', arabic: 'رَبَّنَا أَخْرِجْنَا مِنْ هَذِهِ الْقَرْيَةِ الظَّالِمِ أَهْلُهَا وَاجْعَل لَّنَا مِن لَّدُنكَ وَلِيًّا', translation: 'Our Lord, take us out of this city of oppressive people and appoint for us from Yourself a protector.' },
  { title: 'Rabbana 18', ref: 'Al-Maida 5:83', arabic: 'رَبَّنَا آمَنَّا فَاكْتُبْنَا مَعَ الشَّاهِدِينَ', translation: 'Our Lord, we have believed, so register us among the witnesses.' },
  { title: 'Rabbana 19', ref: 'Al-Araf 7:23', arabic: 'رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ', translation: 'Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us, we will surely be among the losers.' },
  { title: 'Rabbana 20', ref: 'Al-Araf 7:47', arabic: 'رَبَّنَا لَا تَجْعَلْنَا مَعَ الْقَوْمِ الظَّالِمِينَ', translation: 'Our Lord, do not place us with the wrongdoing people.' },
  { title: 'Rabbana 21', ref: 'Yunus 10:85-86', arabic: 'رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلْقَوْمِ الظَّالِمِينَ وَنَجِّنَا بِرَحْمَتِكَ مِنَ الْقَوْمِ الْكَافِرِينَ', translation: 'Our Lord, do not make us a trial for the wrongdoing people. And save us by Your mercy from the disbelieving people.' },
  { title: 'Rabbana 22', ref: 'Ibrahim 14:38', arabic: 'رَبَّنَا إِنَّكَ تَعْلَمُ مَا نُخْفِي وَمَا نُعْلِنُ وَمَا يَخْفَى عَلَى اللَّهِ مِن شَيْءٍ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ', translation: 'Our Lord, indeed You know what we conceal and what we declare, and nothing is hidden from Allah on earth or in the heaven.' },
  { title: 'Rabbana 23', ref: 'Ibrahim 14:40', arabic: 'رَبَّنَا وَاجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ', translation: 'Our Lord, make me an establisher of prayer, and from my descendants. Our Lord, and accept my supplication.' },
  { title: 'Rabbana 24', ref: 'Ibrahim 14:41', arabic: 'رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ', translation: 'Our Lord, forgive me and my parents and the believers the Day the account is established.' },
  { title: 'Rabbana 25', ref: 'Al-Kahf 18:10', arabic: 'رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا', translation: 'Our Lord, grant us from Yourself mercy and prepare for us from our affair right guidance.' },
  { title: 'Rabbana 26', ref: 'Ta-Ha 20:45', arabic: 'رَبَّنَا إِنَّنَا نَخَافُ أَن يَفْرُطَ عَلَيْنَا أَوْ أَن يَطْغَى', translation: 'Our Lord, indeed we are afraid that he will hasten against us or that he will transgress.' },
  { title: 'Rabbana 27', ref: 'Al-Muminun 23:97-98', arabic: 'رَّبِّ أَعُوذُ بِكَ مِنْ هَمَزَاتِ الشَّيَاطِينِ وَأَعُوذُ بِكَ رَبِّ أَن يَحْضُرُونِ', translation: 'My Lord, I seek refuge in You from the incitements of the devils, and I seek refuge in You, my Lord, lest they be present with me.' },
  { title: 'Rabbana 28', ref: 'Al-Furqan 25:65', arabic: 'رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ إِنَّ عَذَابَهَا كَانَ غَرَامًا', translation: 'Our Lord, avert from us the punishment of Hell. Indeed its punishment is ever adhering.' },
  { title: 'Rabbana 29', ref: 'Al-Furqan 25:74', arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا', translation: 'Our Lord, grant us from among our wives and offspring comfort to our eyes and make us an example for the righteous.' },
  { title: 'Rabbana 30', ref: 'Ash-Shuara 26:83-85', arabic: 'رَبِّ هَبْ لِي حُكْمًا وَأَلْحِقْنِي بِالصَّالِحِينَ وَاجْعَل لِّي لِسَانَ صِدْقٍ فِي الْآخِرِينَ', translation: 'My Lord, grant me wisdom and join me with the righteous. And grant me a reputation of honor among later generations.' },
  { title: 'Rabbana 31', ref: 'An-Naml 27:19', arabic: 'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَى وَالِدَيَّ', translation: 'My Lord, enable me to be grateful for Your favor which You have bestowed upon me and upon my parents.' },
  { title: 'Rabbana 32', ref: 'Al-Qasas 28:16', arabic: 'رَبِّ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي', translation: 'My Lord, indeed I have wronged myself, so forgive me.' },
  { title: 'Rabbana 33', ref: 'Al-Ankabut 29:30', arabic: 'رَبِّ انصُرْنِي عَلَى الْقَوْمِ الْمُفْسِدِينَ', translation: 'My Lord, support me against the corrupting people.' },
  { title: 'Rabbana 34', ref: 'Ghafir 40:7-8', arabic: 'رَبَّنَا وَسِعْتَ كُلَّ شَيْءٍ رَّحْمَةً وَعِلْمًا فَاغْفِرْ لِلَّذِينَ تَابُوا وَاتَّبَعُوا سَبِيلَكَ', translation: 'Our Lord, You have encompassed all things in mercy and knowledge, so forgive those who have repented and followed Your way.' },
  { title: 'Rabbana 35', ref: 'Ghafir 40:9', arabic: 'رَبَّنَا وَأَدْخِلْهُمْ جَنَّاتِ عَدْنٍ الَّتِي وَعَدتَّهُمْ وَمَن صَلَحَ مِنْ آبَائِهِمْ وَأَزْوَاجِهِمْ وَذُرِّيَّاتِهِمْ', translation: 'Our Lord, and admit them to gardens of perpetual residence which You have promised them, and whoever was righteous among their fathers, their spouses and their offspring.' },
  { title: 'Rabbana 36', ref: 'Ash-Shura 42:10', arabic: 'رَبَّنَا آمَنَّا فَاغْفِرْ لَنَا وَارْحَمْنَا وَأَنتَ خَيْرُ الرَّاحِمِينَ', translation: 'Our Lord, we have believed, so forgive us and have mercy upon us, and You are the best of the merciful.' },
  { title: 'Rabbana 37', ref: 'Ad-Dukhan 44:12', arabic: 'رَبَّنَا اكْشِفْ عَنَّا الْعَذَابَ إِنَّا مُؤْمِنُونَ', translation: 'Our Lord, remove from us the torment; indeed we are believers.' },
  { title: 'Rabbana 38', ref: 'Al-Ahqaf 46:15', arabic: 'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَى وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ', translation: 'My Lord, enable me to be grateful for Your favor which You have bestowed upon me and my parents and to do righteousness of which You approve.' },
  { title: 'Rabbana 39', ref: 'Al-Hashr 59:10', arabic: 'رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالْإِيمَانِ وَلَا تَجْعَلْ فِي قُلُوبِنَا غِلًّا لِّلَّذِينَ آمَنُوا', translation: 'Our Lord, forgive us and our brothers who preceded us in faith, and put not in our hearts any resentment toward those who have believed.' },
  { title: 'Rabbana 40', ref: 'Al-Mumtahina 60:4-5', arabic: 'رَبَّنَا عَلَيْكَ تَوَكَّلْنَا وَإِلَيْكَ أَنَبْنَا وَإِلَيْكَ الْمَصِيرُ رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلَّذِينَ كَفَرُوا', translation: 'Our Lord, upon You we have relied, and to You we have returned, and to You is the destination. Our Lord, make us not a trial for those who disbelieve.' },
];

// Dua audio URLs (Mishary Alafasy from everyayah.com CDN)
const DUA_AUDIO_URLS = [
  'https://cdn.islamic.network/quran/audio/128/ar.alafasy/2.mp3',
  'https://cdn.islamic.network/quran/audio/128/ar.alafasy/3.mp3',
  'https://cdn.islamic.network/quran/audio/128/ar.alafasy/4.mp3',
  'https://cdn.islamic.network/quran/audio/128/ar.alafasy/5.mp3',
  'https://cdn.islamic.network/quran/audio/128/ar.alafasy/6.mp3',
];

const HADITHS = [
  { text: "The best of people are those who are most beneficial to people.", source: "Al-Mu'jam al-Awsat" },
  { text: "Whoever believes in Allah and the Last Day, let him speak good or remain silent.", source: "Bukhari & Muslim" },
  { text: "A strong person is not one who throws their opponents to the ground. A strong person is one who contains themselves when they are angry.", source: "Bukhari & Muslim" },
  { text: "Make things easy and do not make things difficult. Give glad tidings and do not repel people.", source: "Bukhari & Muslim" },
  { text: "None of you will have faith till he wishes for his Muslim brother what he likes for himself.", source: "Bukhari" },
  { text: "The most beloved deed to Allah is the most regular and constant even though it were little.", source: "Bukhari" },
  { text: "Whoever guides someone to virtue will be rewarded equivalent to him who practices that good action.", source: "Muslim" },
  { text: "Speak the truth even if it is bitter.", source: "Ibn Hibban" },
  { text: "Part of the perfection of one's Islam is his leaving that which does not concern him.", source: "Tirmidhi" },
  { text: "The world is a prison for the believer and a paradise for the unbeliever.", source: "Muslim" },
  { text: "Allah does not look at your forms and your possessions; rather, He looks at your hearts and your deeds.", source: "Muslim" },
  { text: "Feed the hungry, visit the sick, and free the captive.", source: "Bukhari" },
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function getDhakaTime() {
  return new Date();
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
}

function parseTimeStr(str) {
  if (!str) return new Date();
  const parts = str.trim().split(' ');
  const [h, m] = parts[0].split(':').map(Number);
  const period = parts[1];
  let hours = h;
  if (period === 'PM' && h !== 12) hours += 12;
  if (period === 'AM' && h === 12) hours = 0;
  const d = getDhakaTime();
  d.setHours(hours, m, 0, 0);
  return d;
}

function msToHMS(ms) {
  if (ms <= 0) return { h:0, m:0, s:0 };
  const total = Math.floor(ms / 1000);
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

function getDailyAyah() {
  const now = getDhakaTime();
  const key = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return AYAH_POOL[key % AYAH_POOL.length];
}

function getDailyHadith() {
  const now = getDhakaTime();
  const key = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return HADITHS[key % HADITHS.length];
}

function getIslamicContext(hijriMonth, hijriDay) {
  const map = {
    '1-1':  { label:'Islamic New Year', color:'#7c3aed' },
    '1-10': { label:'Day of Ashura', color:'#6366f1' },
    '3-12': { label:'Mawlid al-Nabi (s.a.w)', color:'#059669' },
    '7-27': { label:"Isra' wal Mi'raj", color:'#d97706' },
    '8-15': { label:"Laylat al-Bara'ah", color:'#d97706' },
    '9-1':  { label:'Ramadan Mubarak', color:'#be185d' },
    '9-21': { label:'Laylat al-Qadr could be tonight', color:'#d97706' },
    '9-23': { label:'Laylat al-Qadr could be tonight', color:'#d97706' },
    '9-25': { label:'Laylat al-Qadr could be tonight', color:'#d97706' },
    '9-27': { label:'Most likely Laylat al-Qadr', color:'#f59e0b' },
    '9-29': { label:'Laylat al-Qadr could be tonight', color:'#d97706' },
    '10-1': { label:'Eid al-Fitr Mubarak', color:'#059669' },
    '12-9': { label:'Day of Arafah', color:'#d97706' },
    '12-10':{ label:'Eid al-Adha Mubarak', color:'#059669' },
  };
  return map[`${hijriMonth}-${hijriDay}`] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRAYER CIRCLE LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function getPrayerCircle(prayers, now) {
  if (!prayers || prayers.length < 5)
    return { label:'Loading', sublabel:'', color:'#cc2244', progress:0, msLeft:0 };

  const fajr    = parseTimeStr(prayers[0].time);
  const dhuhr   = parseTimeStr(prayers[1].time);
  const asr     = parseTimeStr(prayers[2].time);
  const maghrib = parseTimeStr(prayers[3].time);
  const isha    = parseTimeStr(prayers[4].time);

  const sunrise  = new Date(fajr.getTime()    + 80  * 60000);
  const ishraq   = new Date(fajr.getTime()    + 90  * 60000);
  const dhuhaEnd = new Date(dhuhr.getTime()   - 20  * 60000);
  const zawal    = new Date(dhuhr.getTime()   - 10  * 60000);
  const asrRestr = new Date(maghrib.getTime() - 20  * 60000);
  // If now is before fajr (post-midnight), nextFajr is today's fajr, else tomorrow's
  const nextFajr = now < fajr
    ? new Date(fajr.getTime())
    : new Date(fajr.getTime() + 24 * 3600000);
  const ishaEnd  = new Date(nextFajr.getTime() - 120 * 60000);

  let label, sublabel='', color, from, to;
  const C = '#cc2244', R = '#ee1133', G = '#22c55e', P = '#a855f7';

  if      (now>=fajr    && now<sunrise)  { label='Fajr';        sublabel='Pray now';       color=C; from=fajr;    to=sunrise;  }
  else if (now>=sunrise && now<ishraq)   { label='Ishraq';      sublabel='Restriction';    color=R; from=sunrise; to=ishraq;   }
  else if (now>=ishraq  && now<dhuhaEnd) { label='Dhuha';       sublabel='Nafl time';      color=G; from=ishraq;  to=dhuhaEnd; }
  else if (now>=dhuhaEnd&& now<zawal)    { label='Pre-Dhuhr';   sublabel='Restriction';    color=R; from=dhuhaEnd;to=zawal;    }
  else if (now>=zawal   && now<dhuhr)    { label="Jumu'ah";     sublabel='Friday prayer';  color=C; from=zawal;   to=dhuhr;    }
  else if (now>=dhuhr   && now<asr)      { label='Dhuhr';       sublabel='Pray now';       color=C; from=dhuhr;   to=asr;      }
  else if (now>=asr     && now<asrRestr) { label='Asr';         sublabel='Pray now';       color=C; from=asr;     to=asrRestr; }
  else if (now>=asrRestr&& now<maghrib)  { label='Asr';         sublabel='Restriction';    color=R; from=asrRestr;to=maghrib;  }
  else if (now>=maghrib && now<isha)     { label='Maghrib';     sublabel='Pray now';       color=C; from=maghrib; to=isha;     }
  else if (now>=isha    && now<ishaEnd)  { label='Isha';        sublabel='Pray now';       color=C; from=isha;    to=ishaEnd;  }
  else                                   { label='Tahajjud';    sublabel='Night prayer';   color=P; from=ishaEnd; to=nextFajr; }

  const total    = to - from;
  const elapsed  = now - from;
  const progress = Math.min(Math.max(elapsed / total, 0), 1);
  const msLeft   = to - now;
  return { label, sublabel, color, progress, msLeft };
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function cacheSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// QIBLA
// ─────────────────────────────────────────────────────────────────────────────

function calcQibla(lat, lng) {
  const kaabaLat = 21.4225 * Math.PI / 180;
  const kaabaLng = 39.8262 * Math.PI / 180;
  const userLat  = lat     * Math.PI / 180;
  const dLng     = kaabaLng - lng * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(kaabaLat);
  const x = Math.cos(userLat)*Math.sin(kaabaLat) - Math.sin(userLat)*Math.cos(kaabaLat)*Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

const DHAKA_QIBLA = Math.round(calcQibla(DHAKA.lat, DHAKA.lng));

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  // Auth
  const [authed,       setAuthed]       = useState(false);
  const [loginUser,    setLoginUser]    = useState('');
  const [loginPass,    setLoginPass]    = useState('');
  const [loginError,   setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Core state
  const [now,          setNow]          = useState(getDhakaTime);
  const [theme,        setTheme]        = useState('dark');
  const [activeTab,    setActiveTab]    = useState('home');     // home | quran | dhikr | duas | settings

  // Prayer data
  const [prayers,      setPrayers]      = useState([]);
  const [hijriLabel,   setHijriLabel]   = useState('');
  const [hijriCal,     setHijriCal]     = useState([]);
  const [calMonth,     setCalMonth]     = useState(null);
  const [calYear,      setCalYear]      = useState(null);
  const [todayHijri,   setTodayHijri]   = useState(null);
  const [islamicEvent, setIslamicEvent] = useState(null);
  const [ramadanInfo,  setRamadanInfo]  = useState(null);

  // Chat
  const [messages,     setMessages]     = useState([
    { role:'assistant', content:"As-salamu alaykum Muntasir! 🌙 I'm Noor, your Islamic assistant. Ask me anything about Islam, prayer, or the Quran." },
  ]);
  const [input,        setInput]        = useState('');
  const [chatLoading,  setChatLoading]  = useState(false);
  const [chatOpen,     setChatOpen]     = useState(false);
  const chatEndRef = useRef(null);

  // Dhikr / Tasbih
  const [tasbeehCount,  setTasbeehCount]  = useState(0);
  const [tasbeehTarget, setTasbeehTarget] = useState(33);
  const [tasbeehLabel,  setTasbeehLabel]  = useState('SubhanAllah');
  const [tasbeehFlash,  setTasbeehFlash]  = useState(false);

  // Prayer tracker
  const [prayedToday,  setPrayedToday]  = useState({ Fajr:false, Dhuhr:false, Asr:false, Maghrib:false, Isha:false });

  // Quran
  const [surahs,       setSurahs]       = useState([]);
  const [selSurah,     setSelSurah]     = useState(null);
  const [surahVerses,  setSurahVerses]  = useState([]);
  const [quranLoading, setQuranLoading] = useState(false);
  const [quranSearch,  setQuranSearch]  = useState('');
  const [bookmarks,    setBookmarks]    = useState([]);
  const [quranView,    setQuranView]    = useState('list'); // list | verses
  const [audioSrc,     setAudioSrc]     = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  // Dua ambient player
  const [duaPlaying,    setDuaPlaying]    = useState(false);
  const [duaIndex,      setDuaIndex]      = useState(0);
  const duaAudioRef = useRef(null);

  // Quran recitation player
  const [recitPlaying,  setRecitPlaying]  = useState(false);
  const [recitLoading,  setRecitLoading]  = useState(false);
  const recitAudioRef = useRef(null);

  // Refs
  const lastFetchedDate = useRef('');

  // ── Clock tick ──
  useEffect(() => {
    function tick() {
      const n = getDhakaTime();
      setNow(n);
      const dateStr = `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`;
      if (dateStr !== lastFetchedDate.current) {
        lastFetchedDate.current = dateStr;
        fetchPrayerData(n);
      }
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Fetch prayer data (with cache) ──
  function fetchPrayerData(date) {
    const d = date.getDate(), mo = date.getMonth()+1, y = date.getFullYear();
    const cacheKey = `prayer_${d}_${mo}_${y}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      applyPrayerData(cached);
      return;
    }
    fetch(`https://api.aladhan.com/v1/timings/${d}-${mo}-${y}?latitude=${DHAKA.lat}&longitude=${DHAKA.lng}&method=1&school=1`)
      .then(r => r.json())
      .then(data => {
        cacheSet(cacheKey, data.data);
        applyPrayerData(data.data);
      })
      .catch(err => console.error('Prayer fetch error:', err));
  }

  function applyPrayerData(data) {
    const t = data.timings;
    const fmt = s => {
      const [hh, mm] = s.split(':').map(Number);
      const p = hh >= 12 ? 'PM' : 'AM';
      return `${hh % 12 || 12}:${pad(mm)} ${p}`;
    };
    setPrayers([
      { name:'Fajr',    time:fmt(t.Fajr)    },
      { name:'Dhuhr',   time:fmt(t.Dhuhr)   },
      { name:'Asr',     time:fmt(t.Asr)     },
      { name:'Maghrib', time:fmt(t.Maghrib)  },
      { name:'Isha',    time:fmt(t.Isha)     },
    ]);
    const hijri  = data.date.hijri;
    const hDay   = parseInt(hijri.day);
    const hMonth = parseInt(hijri.month.number);
    const hYear  = parseInt(hijri.year);
    setHijriLabel(`${hijri.day} ${hijri.month.en} ${hijri.year} AH`);
    setTodayHijri({ day:hDay, month:hMonth, year:hYear });
    setCalMonth(hMonth);
    setCalYear(hYear);
    setIslamicEvent(getIslamicContext(hMonth, hDay));
    if (hMonth === 9) setRamadanInfo({ day:hDay, isLastTen: hDay>=21, isOddNight:[21,23,25,27,29].includes(hDay) });
    else setRamadanInfo(null);
  }

  // ── Hijri calendar ──
  useEffect(() => {
    if (!calMonth || !calYear) return;
    const cacheKey = `hcal_${calMonth}_${calYear}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setHijriCal(cached); return; }
    fetch(`https://api.aladhan.com/v1/hToGCalendar/${calMonth}/${calYear}`)
      .then(r => r.json())
      .then(data => { if (data.data) { setHijriCal(data.data); cacheSet(cacheKey, data.data); } })
      .catch(err => console.error('Calendar fetch error:', err));
  }, [calMonth, calYear]);

  // ── Load surahs ──
  useEffect(() => {
    const cached = cacheGet('surahs');
    if (cached) { setSurahs(cached); return; }
    fetch('https://api.alquran.cloud/v1/surah')
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          setSurahs(data.data);
          cacheSet('surahs', data.data);
        }
      })
      .catch(() => {});
  }, []);

  // ── Load bookmarks ──
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem('quran_bookmarks') || '[]');
      setBookmarks(b);
    } catch {}
  }, []);

  // ── Load prayer tracker ──
  useEffect(() => {
    try {
      const key = `prayed_${new Date().toDateString()}`;
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      setPrayedToday(prev => ({ ...prev, ...saved }));
    } catch {}
  }, []);

  // ── Scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  // ── Prayer circle derived values ──
  const circle = getPrayerCircle(prayers, now);
  const { h, m, s } = msToHMS(circle.msLeft);
  const R    = 68;
  const CIRC = 2 * Math.PI * R;
  const dash = CIRC * (1 - circle.progress);

  const ayah   = getDailyAyah();
  const hadith = getDailyHadith();

  // ── Calendar helpers ──
  const isToday = (dayNum) =>
    todayHijri && todayHijri.day===dayNum && todayHijri.month===calMonth && todayHijri.year===calYear;

  const isUncertain = (dayNum) => {
    if (!todayHijri || todayHijri.month!==calMonth || todayHijri.year!==calYear || isToday(dayNum)) return false;
    const total = hijriCal.length || 30;
    if (dayNum===30 || dayNum===total) return true;
    if (todayHijri.day >= total-2) return dayNum===todayHijri.day-1 || dayNum===todayHijri.day+1;
    return false;
  };

  const daysInMonth = hijriCal.length || 30;
  const calDays = Array.from({ length:daysInMonth }, (_,i) => i+1);

  const prevMonth = () => { setHijriCal([]); if(calMonth===1){setCalMonth(12);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); };
  const nextMonth = () => { setHijriCal([]); if(calMonth===12){setCalMonth(1);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); };

  // ── Login ──
  const handleLogin = async () => {
    if (loginUser.trim() !== AUTH_USER) { setLoginError('Invalid username or password.'); return; }
    setLoginLoading(true);
    setLoginError('');
    const encoder = new TextEncoder();
    const data = encoder.encode(loginPass);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    if (hashHex === AUTH_HASH) {
      setAuthed(true);
    } else {
      setLoginError('Invalid username or password.');
    }
    setLoginLoading(false);
  };

  const handleLoginKey = e => { if (e.key === 'Enter') handleLogin(); };

  // ── Chat ──
  const sendMessage = useCallback(async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg    = { role:'user', content:input.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setChatLoading(true);
    try {
      const res  = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages: newHistory }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role:'assistant',
        content: data.error ? `⚠️ ${data.error}` : data.reply,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role:'assistant', content:`⚠️ Network error: ${err.message}` }]);
    }
    setChatLoading(false);
  }, [input, messages, chatLoading]);

  const handleKey = e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); } };

  // ── Tasbih ──
  const tapTasbih = () => {
    const next = tasbeehCount + 1;
    setTasbeehCount(next);
    setTasbeehFlash(true);
    setTimeout(() => setTasbeehFlash(false), 200);
    if (next % tasbeehTarget === 0) {
      const labels = ['SubhanAllah','Alhamdulillah','Allahu Akbar'];
      const idx = Math.floor(next / tasbeehTarget) % labels.length;
      setTasbeehLabel(labels[idx]);
    }
  };
  const resetTasbih = () => { setTasbeehCount(0); setTasbeehLabel('SubhanAllah'); };

  // ── Prayer tracker ──
  const togglePrayed = (name) => {
    const updated = { ...prayedToday, [name]: !prayedToday[name] };
    setPrayedToday(updated);
    try {
      const key = `prayed_${new Date().toDateString()}`;
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  };

  // ── Quran ──
  const loadSurah = async (surah) => {
    setSelSurah(surah);
    setQuranView('verses');
    setQuranLoading(true);
    const cacheKey = `surah2_${surah.number}`;
    const cached = cacheGet(cacheKey);
    if (cached) { setSurahVerses(cached); setQuranLoading(false); return; }
    try {
      // quran.com API v4 -- bismillah is separate, verses start from 1 correctly
      const res = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surah.number}?language=en&words=false&translations=131&per_page=300&fields=text_uthmani`);
      const data = await res.json();
      const verses = data.verses.map(v => ({
        number: v.verse_number,
        arabic: v.text_uthmani,
        english: v.translations?.[0]?.text?.replace(/<[^>]+>/g, '') || '',
      }));
      setSurahVerses(verses);
      cacheSet(cacheKey, verses);
    } catch { setSurahVerses([]); }
    setQuranLoading(false);
  };

  const toggleBookmark = (surahNum, verseNum) => {
    const key = `${surahNum}:${verseNum}`;
    const updated = bookmarks.includes(key)
      ? bookmarks.filter(b => b !== key)
      : [...bookmarks, key];
    setBookmarks(updated);
    try { localStorage.setItem('quran_bookmarks', JSON.stringify(updated)); } catch {}
  };

  const isBookmarked = (surahNum, verseNum) => bookmarks.includes(`${surahNum}:${verseNum}`);

  // ── Recitation ──
  const playFromVerse = (surahNum, verseNum) => {
    // Yasser Al-Dosari murattal -- mp3quran.net server 7
    const surah = String(surahNum).padStart(3, '0');
    const verse = String(verseNum).padStart(3, '0');
    const url = `https://verses.quran.com/Yasser_Ad-Dossari/mp3/${surah}${verse}.mp3`;
    setAudioSrc(url);
    setAudioPlaying(true);
    setTimeout(() => { if (audioRef.current) { audioRef.current.play(); } }, 100);
  };

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setAudioPlaying(false);
    setAudioSrc(null);
  };

  // ── Dua Ambient Player ──
  // Uses islamic.network CDN for full Quran audio by Alafasy -- we use short surahs as ambient
  const DUA_AMBIENT = [
    'https://cdn.islamic.network/quran/audio/128/ar.alafasy/112.mp3',
    'https://cdn.islamic.network/quran/audio/128/ar.alafasy/113.mp3',
    'https://cdn.islamic.network/quran/audio/128/ar.alafasy/114.mp3',
    'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
    'https://cdn.islamic.network/quran/audio/128/ar.alafasy/67.mp3',
    'https://cdn.islamic.network/quran/audio/128/ar.alafasy/55.mp3',
    'https://cdn.islamic.network/quran/audio/128/ar.alafasy/36.mp3',
    'https://cdn.islamic.network/quran/audio/128/ar.alafasy/56.mp3',
  ];

  const toggleDuaAmbient = () => {
    if (!duaAudioRef.current) return;
    if (duaPlaying) {
      duaAudioRef.current.pause();
      setDuaPlaying(false);
    } else {
      duaAudioRef.current.src = DUA_AMBIENT[duaIndex];
      duaAudioRef.current.play().catch(() => {});
      setDuaPlaying(true);
    }
  };

  const onDuaEnded = () => {
    const next = (duaIndex + 1) % DUA_AMBIENT.length;
    setDuaIndex(next);
    if (duaAudioRef.current) {
      duaAudioRef.current.src = DUA_AMBIENT[next];
      duaAudioRef.current.play().catch(() => {});
    }
  };

  // ── Quran Recitation Player (Yasser Al-Dosari full surah) ──
  const playRecitation = (surahNum) => {
    if (!recitAudioRef.current) return;
    const num = String(surahNum).padStart(3, '0');
    // mp3quran.net -- Yasser Al-Dosari (server 7 = yasser)
    const url = `https://server7.mp3quran.net/yasser/${num}.mp3`;
    recitAudioRef.current.src = url;
    setRecitLoading(true);
    setRecitPlaying(true);
    recitAudioRef.current.play().catch(() => { setRecitPlaying(false); setRecitLoading(false); });
  };

  const toggleRecitation = () => {
    if (!recitAudioRef.current) return;
    if (recitPlaying) {
      recitAudioRef.current.pause();
      setRecitPlaying(false);
    } else {
      recitAudioRef.current.play().catch(() => {});
      setRecitPlaying(true);
    }
  };

  const stopRecitation = () => {
    if (recitAudioRef.current) { recitAudioRef.current.pause(); recitAudioRef.current.currentTime = 0; }
    setRecitPlaying(false);
    setRecitLoading(false);
  };

  // Ramadan / Iftar countdown
  const getIftarCountdown = () => {
    if (!prayers.length) return null;
    const maghrib = parseTimeStr(prayers[3].time);
    const diff = maghrib - now;
    if (diff > 0 && diff < 24*3600000) return msToHMS(diff);
    return null;
  };
  const iftarIn = getIftarCountdown();

  // ─────────────────────────────────────────────────────────────────────────
  // THEME VARS
  // ─────────────────────────────────────────────────────────────────────────

  const isDark = theme === 'dark';
  const T = isDark ? {
    bg:      '#000000',
    bgMid:   '#0d0d0d',
    card:    '#111111',
    border:  '#2a2a2a',
    borderHi:'#cc2244',
    text:    '#f0f0f0',
    dim:     '#888888',
    accent:  '#cc2244',
    accentLo:'#7a1228',
    gold:    '#f59e0b',
    green:   '#22c55e',
    tabBg:   '#1a1a1a',
    tabActive:'#cc2244',
  } : {
    bg:      '#fff5f7',
    bgMid:   '#ffe8ed',
    card:    '#ffffff',
    border:  '#f0b0be',
    borderHi:'#cc2244',
    text:    '#2a0810',
    dim:     '#a04060',
    accent:  '#cc2244',
    accentLo:'#ffd0da',
    gold:    '#b45309',
    green:   '#16a34a',
    tabBg:   '#ffe8ed',
    tabActive:'#cc2244',
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const prayedCount = Object.values(prayedToday).filter(Boolean).length;

  const filteredSurahs = surahs.filter(s =>
    s.englishName.toLowerCase().includes(quranSearch.toLowerCase()) ||
    s.name.includes(quranSearch) ||
    String(s.number).includes(quranSearch)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Islamic Dashboard -- Muntasir</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Amiri:ital,wght@0,400;0,700;1,400&family=Noto+Color+Emoji&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          width: 100%; height: 100%;
          background: #000;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Rotate wrapper -- landscape layout on portrait screen */
        .app-rotate {
          position: fixed;
          top: 50%; left: 50%;
          width: 100vh;
          height: 100vw;
          transform: translate(-50%, -50%) rotate(90deg);
          transform-origin: center center;
          overflow: hidden;
          background: ${T.bg};
          transition: background 0.3s ease;
        }

        /* Main shell */
        .shell {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          color: ${T.text};
          transition: color 0.3s ease;
        }

        /* Top bar */
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px 8px;
          border-bottom: 1px solid ${T.border};
          flex-shrink: 0;
          background: ${T.bg};
        }
        .topbar-left { display: flex; flex-direction: column; gap: 1px; }
        .topbar-greeting { font-size: 0.72rem; font-weight: 500; color: ${T.dim}; letter-spacing: 0.05em; text-transform: uppercase; }
        .topbar-clock { font-size: 1.7rem; font-weight: 700; letter-spacing: -0.02em; color: ${T.text}; line-height: 1; font-variant-numeric: tabular-nums; }
        .topbar-date { font-size: 0.72rem; font-weight: 500; color: ${T.dim}; margin-top: 1px; }
        .topbar-hijri { font-size: 0.7rem; color: ${T.accent}; font-weight: 600; }

        .topbar-right { display: flex; align-items: center; gap: 8px; }

        .icon-btn {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 10px;
          width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 1.1rem;
          transition: background 0.15s, transform 0.1s;
          flex-shrink: 0;
        }
        .icon-btn:active { transform: scale(0.93); background: ${T.accentLo}; }

        /* Event banner */
        .event-banner {
          padding: 6px 16px;
          font-size: 0.78rem;
          font-weight: 600;
          text-align: center;
          letter-spacing: 0.03em;
          flex-shrink: 0;
        }

        /* Ramadan banner */
        .ramadan-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 16px;
          background: ${isDark ? '#1a0a10' : '#fff0f3'};
          border-bottom: 1px solid ${T.border};
          flex-shrink: 0;
        }
        .ramadan-day { font-size: 0.72rem; font-weight: 700; color: ${T.accent}; }
        .ramadan-iftar { font-size: 0.72rem; color: ${T.dim}; }
        .ramadan-iftar span { color: ${T.gold}; font-weight: 700; }

        /* Main content area */
        .content {
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* Bottom nav */
        .bottomnav {
          display: flex;
          align-items: center;
          border-top: 1px solid ${T.border};
          flex-shrink: 0;
          background: ${T.tabBg};
        }
        .navitem {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 7px 4px 6px;
          cursor: pointer;
          font-size: 0.58rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: ${T.dim};
          gap: 2px;
          transition: color 0.15s;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .navitem.active { color: ${T.tabActive}; }
        .navitem .nav-icon { font-size: 1.25rem; line-height: 1; }
        .navitem:active { opacity: 0.7; }

        /* ── HOME TAB ── */
        .home-grid {
          display: grid;
          grid-template-columns: 1fr 260px;
          height: 100%;
          gap: 0;
        }

        .home-left {
          display: grid;
          grid-template-rows: 1fr auto;
          padding: 12px 10px 12px 14px;
          gap: 10px;
          overflow: hidden;
        }

        .home-middle {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 10px;
          min-height: 0;
          overflow: hidden;
        }

        /* Card */
        .card {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 14px;
          overflow: hidden;
          transition: background 0.3s, border-color 0.3s;
        }
        .card-pad { padding: 12px 14px; }

        /* Calendar */
        .cal-title {
          font-size: 0.82rem; font-weight: 700;
          text-align: center;
          padding: 10px 12px 6px;
          color: ${T.text};
          border-bottom: 1px solid ${T.border};
        }
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          padding: 7px;
        }
        .cday {
          aspect-ratio: 1;
          display: flex; align-items: center; justify-content: center;
          border-radius: 6px;
          font-size: 0.63rem; font-weight: 600;
          background: ${T.bgMid};
          color: ${T.text};
          cursor: default;
          user-select: none;
          transition: background 0.2s;
        }
        .cday.today { background: ${T.accent}; color: #fff; font-weight: 800; }
        .cday.uncertain { background: transparent; border: 1px solid ${T.gold}; color: ${T.gold}; }
        .cal-nav {
          display: flex; justify-content: space-between;
          padding: 5px 10px 8px;
        }
        .cal-nav-btn {
          background: ${T.bgMid};
          border: 1px solid ${T.border};
          border-radius: 7px;
          color: ${T.text};
          font-size: 0.7rem;
          padding: 4px 10px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 600;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .cal-nav-btn:active { background: ${T.accentLo}; }

        /* Prayer section */
        .psec {
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 10px;
          min-height: 0;
        }

        /* Circle card */
        .circle-card {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          padding: 10px;
        }
        .cwrap { position: relative; width: 146px; height: 146px; }
        .cwrap svg { transform: rotate(-90deg); display: block; }
        .cinner {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 0 10px;
        }
        .cinner-sub  { font-size: 0.56rem; letter-spacing: 0.12em; text-transform: uppercase; color: ${T.dim}; font-weight: 600; }
        .cinner-name { font-size: 1.4rem; font-weight: 800; line-height: 1.1; margin: 2px 0; color: ${T.text}; }
        .cinner-time { font-size: 0.62rem; color: ${T.dim}; line-height: 1.7; }

        /* Prayer list */
        .plist {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 14px;
          display: flex; flex-direction: column;
          justify-content: space-around;
          padding: 8px 12px;
          min-height: 0;
          overflow: hidden;
        }
        .prow {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid ${T.border};
          gap: 6px;
        }
        .prow:last-child { border-bottom: none; }
        .prow-left { display: flex; align-items: center; gap: 6px; }
        .prow-icon { font-size: 0.95rem; }
        .prow-name { font-size: 1.05rem; font-weight: 600; color: ${T.text}; }
        .prow-time { font-size: 0.9rem; font-weight: 700; color: ${T.dim}; letter-spacing: 0.02em; }
        .prow-check {
          width: 22px; height: 22px;
          border-radius: 50%;
          border: 2px solid ${T.border};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 0.7rem;
          flex-shrink: 0;
          transition: all 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .prow-check.done { background: ${T.green}; border-color: ${T.green}; color: #fff; }
        .prow-check:active { transform: scale(0.9); }

        /* Ayah card */
        .ayah-card {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 14px;
          padding: 10px 18px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center;
        }
        .ayah-lbl {
          font-size: 0.6rem; letter-spacing: 0.15em;
          text-transform: uppercase; color: ${T.accent};
          font-weight: 700; margin-bottom: 6px;
        }
        .ayah-ar {
          font-family: 'Amiri', serif;
          font-size: 1.35rem; font-weight: 700;
          direction: rtl; line-height: 1.8;
          color: ${T.text}; margin-bottom: 5px;
        }
        .ayah-tr {
          font-style: italic; font-size: 0.82rem;
          color: ${T.dim}; margin-bottom: 3px; line-height: 1.4;
        }
        .ayah-ref { font-size: 0.65rem; color: ${T.accent}; font-weight: 600; }

        /* Home right = chat */
        .home-right {
          border-left: 1px solid ${T.border};
          display: flex; flex-direction: column;
          background: ${T.bgMid};
          height: 100%;
          overflow: hidden;
        }
        .chat-header {
          padding: 10px 14px 8px;
          border-bottom: 1px solid ${T.border};
          display: flex; align-items: center; gap: 8px;
          flex-shrink: 0;
        }
        .chat-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: ${T.accent};
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0;
        }
        .chat-title { font-size: 0.88rem; font-weight: 700; color: ${T.text}; }
        .chat-sub   { font-size: 0.65rem; color: ${T.green}; font-weight: 600; }

        .msgs {
          flex: 1; overflow-y: auto;
          padding: 12px 10px 8px;
          display: flex; flex-direction: column; gap: 8px;
          scrollbar-width: thin;
          scrollbar-color: ${T.border} transparent;
        }
        .msgs::-webkit-scrollbar { width: 2px; }
        .msgs::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }

        .bubble {
          max-width: 88%;
          padding: 8px 12px;
          border-radius: 14px;
          font-size: 0.82rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: 'Inter', sans-serif;
        }
        .bubble.user { align-self: flex-end; background: ${T.accent}; color: #fff; border-bottom-right-radius: 4px; }
        .bubble.assistant { align-self: flex-start; background: ${T.card}; color: ${T.text}; border: 1px solid ${T.border}; border-bottom-left-radius: 4px; }
        .bubble.loading { opacity: 0.5; }
        .bubble.error { border-color: #ef4444; color: #ef4444; }

        .inputrow {
          padding: 8px 10px;
          border-top: 1px solid ${T.border};
          display: flex; align-items: flex-end; gap: 6px;
          flex-shrink: 0;
        }
        .cinput {
          flex: 1;
          background: ${T.card};
          border: 1.5px solid ${T.border};
          border-radius: 18px;
          padding: 8px 13px;
          color: ${T.text};
          font-family: 'Inter', sans-serif;
          font-size: 0.82rem;
          outline: none;
          resize: none;
          line-height: 1.4;
          transition: border-color 0.2s;
          max-height: 80px;
        }
        .cinput::placeholder { color: ${T.dim}; }
        .cinput:focus { border-color: ${T.accent}; }
        .send-btn {
          background: ${T.accent};
          border: none;
          border-radius: 50%;
          width: 34px; height: 34px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.1s, opacity 0.15s;
        }
        .send-btn:active { transform: scale(0.9); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .send-btn svg { fill: white; }

        /* ── QURAN TAB ── */
        .quran-shell {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: ${T.bg};
        }
        .quran-searchbar {
          padding: 10px 14px 8px;
          border-bottom: 1px solid ${T.border};
          display: flex; align-items: center; gap: 8px;
          flex-shrink: 0;
        }
        .qsearch {
          flex: 1;
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 10px;
          padding: 7px 12px;
          color: ${T.text};
          font-family: 'Inter', sans-serif;
          font-size: 0.82rem;
          outline: none;
        }
        .qsearch::placeholder { color: ${T.dim}; }
        .surah-list {
          flex: 1; overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: ${T.border} transparent;
        }
        .surah-list::-webkit-scrollbar { width: 2px; }
        .surah-row {
          display: flex; align-items: center;
          padding: 10px 16px;
          border-bottom: 1px solid ${T.border};
          cursor: pointer;
          gap: 12px;
          transition: background 0.1s;
          -webkit-tap-highlight-color: transparent;
        }
        .surah-row:active { background: ${T.accentLo}; }
        .surah-num {
          width: 30px; height: 30px;
          background: ${T.accentLo};
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 800;
          color: ${T.accent};
          flex-shrink: 0;
        }
        .surah-info { flex: 1; min-width: 0; }
        .surah-en { font-size: 0.88rem; font-weight: 600; color: ${T.text}; }
        .surah-meta { font-size: 0.68rem; color: ${T.dim}; margin-top: 1px; }
        .surah-ar { font-family: 'Amiri', serif; font-size: 1.1rem; color: ${T.accent}; }

        .verses-shell {
          height: 100%;
          display: flex; flex-direction: column;
        }
        .verses-header {
          padding: 10px 14px;
          border-bottom: 1px solid ${T.border};
          display: flex; align-items: center; gap: 10px;
          flex-shrink: 0;
        }
        .back-btn {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 8px;
          padding: 5px 10px;
          color: ${T.text};
          font-size: 0.75rem; font-weight: 600;
          cursor: pointer; font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .back-btn:active { background: ${T.accentLo}; }
        .verses-list {
          flex: 1; overflow-y: auto;
          padding: 10px 14px;
          display: flex; flex-direction: column; gap: 14px;
          scrollbar-width: thin;
          scrollbar-color: ${T.border} transparent;
        }
        .verse-card {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 12px;
          padding: 12px 14px;
        }
        .verse-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 24px; height: 24px;
          background: ${T.accent};
          border-radius: 50%;
          font-size: 0.6rem; font-weight: 800; color: #fff;
          margin-bottom: 8px;
          flex-shrink: 0;
        }
        .verse-arabic {
          font-family: 'Amiri', serif;
          font-size: 1.4rem; font-weight: 700;
          direction: rtl; text-align: right;
          line-height: 1.9; color: ${T.text};
          margin-bottom: 8px;
        }
        .verse-en { font-size: 0.78rem; color: ${T.dim}; line-height: 1.6; }
        .verse-actions { display: flex; gap: 8px; margin-top: 8px; }
        .verse-btn {
          background: ${T.bgMid};
          border: 1px solid ${T.border};
          border-radius: 6px;
          padding: 4px 9px;
          font-size: 0.65rem; font-weight: 600;
          color: ${T.dim};
          cursor: pointer; font-family: inherit;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .verse-btn:active { background: ${T.accentLo}; color: ${T.accent}; }
        .verse-btn.bookmarked { color: ${T.gold}; border-color: ${T.gold}; }

        /* ── DHIKR TAB ── */
        .dhikr-shell {
          height: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }
        .tasbih-side {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 20px 16px;
          border-right: 1px solid ${T.border};
          gap: 16px;
        }
        .tasbih-label { font-size: 0.7rem; color: ${T.dim}; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
        .tasbih-dhikr { font-family: 'Amiri', serif; font-size: 1.6rem; font-weight: 700; color: ${T.text}; text-align: center; direction: rtl; }
        .tasbih-count {
          font-size: 4rem; font-weight: 900;
          color: ${T.accent};
          font-variant-numeric: tabular-nums;
          line-height: 1;
          transition: transform 0.1s;
        }
        .tasbih-count.flash { transform: scale(1.08); }
        .tasbih-target { font-size: 0.72rem; color: ${T.dim}; }
        .tasbih-tap-btn {
          width: 100px; height: 100px;
          border-radius: 50%;
          background: ${T.accent};
          border: none;
          font-size: 2.5rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px ${isDark ? 'rgba(204,34,68,0.4)' : 'rgba(204,34,68,0.2)'};
          transition: transform 0.08s, box-shadow 0.08s;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .tasbih-tap-btn:active { transform: scale(0.92); box-shadow: 0 2px 8px rgba(204,34,68,0.3); }
        .tasbih-controls { display: flex; gap: 8px; }
        .tasbih-ctrl-btn {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 0.7rem; font-weight: 600;
          color: ${T.dim};
          cursor: pointer; font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .tasbih-ctrl-btn:active { background: ${T.accentLo}; color: ${T.accent}; }

        .hadith-side {
          display: flex; flex-direction: column;
          padding: 16px 14px;
          overflow-y: auto;
          gap: 14px;
        }
        .section-title {
          font-size: 0.62rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: ${T.accent};
        }
        .hadith-card {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 12px;
          padding: 12px 14px;
        }
        .hadith-text {
          font-size: 0.82rem; line-height: 1.6;
          color: ${T.text}; font-style: italic;
          margin-bottom: 6px;
        }
        .hadith-src { font-size: 0.65rem; color: ${T.accent}; font-weight: 600; }

        .qibla-card {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 12px;
          padding: 12px 14px;
          display: flex; align-items: center; gap: 12px;
        }
        .qibla-compass {
          width: 50px; height: 50px; flex-shrink: 0;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .qibla-arrow {
          font-size: 1.8rem;
          display: block;
          transform: rotate(${DHAKA_QIBLA}deg);
          transform-origin: center;
        }
        .qibla-info { flex: 1; }
        .qibla-deg { font-size: 1.2rem; font-weight: 800; color: ${T.accent}; }
        .qibla-label { font-size: 0.7rem; color: ${T.dim}; }

        .prayer-tracker-card {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 12px;
          padding: 12px 14px;
        }
        .tracker-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 8px;
        }
        .tracker-progress {
          font-size: 0.75rem; font-weight: 700; color: ${T.accent};
        }
        .tracker-bar-bg {
          height: 4px; background: ${T.border}; border-radius: 2px;
          margin-bottom: 10px; overflow: hidden;
        }
        .tracker-bar-fill {
          height: 100%;
          background: ${T.green};
          border-radius: 2px;
          width: ${(prayedCount / 5 * 100)}%;
          transition: width 0.4s ease;
        }
        .tracker-prayers { display: flex; flex-direction: column; gap: 5px; }
        .tracker-row {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 0.78rem;
        }
        .tracker-name { font-weight: 600; color: ${T.text}; display: flex; align-items: center; gap: 6px; }
        .tracker-check {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid ${T.border};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 0.65rem;
          transition: all 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .tracker-check.done { background: ${T.green}; border-color: ${T.green}; color: #fff; }
        .tracker-check:active { transform: scale(0.88); }

        /* ── DUAS TAB ── */
        .duas-shell {
          height: 100%;
          overflow-y: auto;
          padding: 12px 14px;
          display: flex; flex-direction: column; gap: 10px;
          scrollbar-width: thin;
          scrollbar-color: ${T.border} transparent;
        }
        .dua-card {
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 12px;
          padding: 12px 14px;
        }
        .dua-title {
          font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: ${T.accent}; margin-bottom: 6px;
        }
        .dua-arabic {
          font-family: 'Amiri', serif;
          font-size: 1.15rem; font-weight: 700;
          direction: rtl; text-align: right;
          line-height: 1.8; color: ${T.text};
          margin-bottom: 6px;
        }
        .dua-translation { font-size: 0.78rem; color: ${T.dim}; line-height: 1.5; font-style: italic; }

        /* ── SETTINGS TAB ── */
        .settings-shell {
          height: 100%;
          overflow-y: auto;
          padding: 14px;
          display: flex; flex-direction: column; gap: 12px;
          scrollbar-width: thin;
        }
        .settings-row {
          display: flex; align-items: center; justify-content: space-between;
          background: ${T.card};
          border: 1px solid ${T.border};
          border-radius: 12px;
          padding: 13px 16px;
        }
        .settings-label { font-size: 0.88rem; font-weight: 600; color: ${T.text}; }
        .settings-sub   { font-size: 0.68rem; color: ${T.dim}; margin-top: 2px; }
        .toggle {
          width: 44px; height: 24px;
          border-radius: 12px;
          background: ${isDark ? T.accent : T.border};
          position: relative; cursor: pointer;
          transition: background 0.25s;
          flex-shrink: 0;
          border: none;
        }
        .toggle::after {
          content: '';
          position: absolute;
          top: 2px; left: ${isDark ? '22px' : '2px'};
          width: 20px; height: 20px;
          border-radius: 50%; background: #fff;
          transition: left 0.25s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        .settings-value { font-size: 0.8rem; color: ${T.dim}; font-weight: 600; }

        /* Scrollbar global */
        ::-webkit-scrollbar { width: 2px; height: 2px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }

        /* Animations */
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fadein { animation: fadeIn 0.25s ease; }

        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        .pulse { animation: pulse 2s ease-in-out infinite; }
      `}</style>

      <div className="app-rotate">
        {/* LOGIN SCREEN */}
        {!authed && (
          <div style={{
            position:'absolute', inset:0, zIndex:999,
            background:'#000',
            display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            gap:'20px', padding:'40px',
          }}>
            <div style={{textAlign:'center', marginBottom:'8px'}}>
              <div style={{fontFamily:"'Amiri', serif", fontSize:'2rem', color:'#cc2244', marginBottom:'4px'}}>بِسْمِ اللَّهِ</div>
              <div style={{fontSize:'1.1rem', fontWeight:800, color:'#f0f0f0', letterSpacing:'-0.01em'}}>Islamic Dashboard</div>
              <div style={{fontSize:'0.72rem', color:'#666', marginTop:'4px'}}>Personal access only</div>
            </div>

            <div style={{width:'100%', maxWidth:'280px', display:'flex', flexDirection:'column', gap:'10px'}}>
              <input
                style={{
                  background:'#111', border:'1.5px solid #2a2a2a', borderRadius:'10px',
                  padding:'10px 14px', color:'#f0f0f0', fontSize:'0.88rem',
                  fontFamily:'Inter, sans-serif', outline:'none', width:'100%',
                }}
                placeholder="Username"
                value={loginUser}
                onChange={e => setLoginUser(e.target.value)}
                onKeyDown={handleLoginKey}
                autoComplete="off"
              />
              <input
                type="password"
                style={{
                  background:'#111', border:'1.5px solid #2a2a2a', borderRadius:'10px',
                  padding:'10px 14px', color:'#f0f0f0', fontSize:'0.88rem',
                  fontFamily:'Inter, sans-serif', outline:'none', width:'100%',
                }}
                placeholder="Password"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                onKeyDown={handleLoginKey}
                autoComplete="off"
              />
              {loginError && (
                <div style={{fontSize:'0.72rem', color:'#ef4444', textAlign:'center'}}>{loginError}</div>
              )}
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                style={{
                  background: loginLoading ? '#333' : '#cc2244',
                  border:'none', borderRadius:'10px',
                  padding:'11px', color:'#fff',
                  fontSize:'0.88rem', fontWeight:700,
                  cursor: loginLoading ? 'not-allowed' : 'pointer',
                  fontFamily:'Inter, sans-serif',
                  transition:'background 0.2s',
                }}
              >
                {loginLoading ? 'Verifying...' : 'Enter'}
              </button>
            </div>

            <div style={{fontSize:'0.62rem', color:'#333', marginTop:'8px'}}>As-salamu alaykum, Muntasir</div>
          </div>
        )}

        <div className="shell">

          {/* ── TOP BAR ── */}
          <div className="topbar">
            <div className="topbar-left">
              <div className="topbar-greeting">As-salamu alaykum, Muntasir</div>
              <div className="topbar-clock">{formatTime(now)}</div>
              <div className="topbar-date">{formatDate(now)}</div>
              {hijriLabel && <div className="topbar-hijri">{hijriLabel}</div>}
            </div>
            <div className="topbar-right">
              <button className="icon-btn" onClick={() => setTheme(t => t==='dark'?'light':'dark')} title="Toggle theme">
                {isDark ? '☀️' : '🌙'}
              </button>
              <button className="icon-btn" onClick={() => { setActiveTab('home'); setChatOpen(o => !o); }} title="Chat with Noor">
                💬
              </button>
            </div>
          </div>

          {/* ── ISLAMIC EVENT BANNER ── */}
          {islamicEvent && (
            <div className="event-banner" style={{ background: islamicEvent.color + '22', color: islamicEvent.color, borderBottom: `1px solid ${islamicEvent.color}44` }}>
              {islamicEvent.label}
            </div>
          )}

          {/* ── RAMADAN BAR ── */}
          {ramadanInfo && (
            <div className="ramadan-bar">
              <div className="ramadan-day">
                Ramadan Day {ramadanInfo.day}
                {ramadanInfo.isLastTen && ' • Last 10 Nights'}
                {ramadanInfo.isOddNight && ' ⭐'}
              </div>
              <div className="ramadan-iftar">
                {iftarIn
                  ? <>Iftar in <span>{iftarIn.h>0 ? `${iftarIn.h}h ${iftarIn.m}m` : `${iftarIn.m}m ${pad(iftarIn.s)}s`}</span></>
                  : 'Iftar has passed'}
              </div>
            </div>
          )}

          {/* ── MAIN CONTENT ── */}
          <div className="content">

            {/* HOME */}
            {activeTab === 'home' && (
              <div className="home-grid fadein">

                {/* LEFT */}
                <div className="home-left">
                  <div className="home-middle">

                    {/* Hijri Calendar */}
                    <div className="card">
                      <div className="cal-title">
                        {calMonth && calYear ? `${HIJRI_MONTHS[calMonth-1]} ${calYear}` : 'Calendar'}
                      </div>
                      <div className="cal-grid">
                        {calDays.map(day => (
                          <div key={day} className={['cday', isToday(day)&&'today', isUncertain(day)&&'uncertain'].filter(Boolean).join(' ')}>
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="cal-nav">
                        <button className="cal-nav-btn" onClick={prevMonth}>◂ Prev</button>
                        <button className="cal-nav-btn" onClick={nextMonth}>Next ▸</button>
                      </div>
                    </div>

                    {/* Prayer Circle + List */}
                    <div className="psec">
                      <div className="circle-card">
                        <div className="cwrap">
                          <svg width="146" height="146" viewBox="0 0 146 146">
                            <circle cx="73" cy="73" r={R} fill="none" stroke={isDark ? '#1a1a1a' : '#f0e0e5'} strokeWidth="10"/>
                            <circle
                              cx="73" cy="73" r={R}
                              fill="none"
                              stroke={circle.color}
                              strokeWidth="10"
                              strokeLinecap="round"
                              strokeDasharray={CIRC}
                              strokeDashoffset={dash}
                              style={{ transition:'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                            />
                          </svg>
                          <div className="cinner">
                            <span className="cinner-sub">{circle.sublabel || 'Time for'}</span>
                            <span className="cinner-name">{circle.label}</span>
                            <span className="cinner-time">
                              {h>0 ? `${h}h ${pad(m)}m` : m>0 ? `${m}m ${pad(s)}s` : `${s}s`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="plist">
                        {(prayers.length ? prayers : ['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(n=>({name:n,time:''}))).map(p => (
                          <div key={p.name} className="prow">
                            <div className="prow-left">
                              <span className="prow-icon">{PRAYER_ICONS[p.name]}</span>
                              <span className="prow-name">{p.name}</span>
                            </div>
                            <span className="prow-time" style={!p.time?{color:T.dim}:{}}>{p.time||'--'}</span>
                            <div
                              className={`prow-check${prayedToday[p.name]?' done':''}`}
                              onClick={() => togglePrayed(p.name)}
                            >
                              {prayedToday[p.name] ? '✓' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ayah */}
                  <div className="ayah-card">
                    <div className="ayah-lbl">Verse of the Day</div>
                    <div className="ayah-ar">{ayah.arabic}</div>
                    <div className="ayah-tr">{ayah.translation}</div>
                    <div className="ayah-ref">{ayah.ref}</div>
                  </div>
                </div>

                {/* RIGHT = CHAT */}
                <div className="home-right">
                  <div className="chat-header">
                    <div className="chat-avatar">N</div>
                    <div>
                      <div className="chat-title">Noor</div>
                      <div className="chat-sub">● Online</div>
                    </div>
                  </div>
                  <div className="msgs">
                    {messages.map((msg, i) => (
                      <div key={i} className={['bubble', msg.role, msg.content?.startsWith('⚠️')?'error':''].filter(Boolean).join(' ')}>
                        {msg.content}
                      </div>
                    ))}
                    {chatLoading && <div className="bubble assistant loading pulse">Noor is thinking...</div>}
                    <div ref={chatEndRef}/>
                  </div>
                  <div className="inputrow">
                    <textarea
                      className="cinput"
                      rows={1}
                      placeholder="Ask Noor anything..."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKey}
                    />
                    <button className="send-btn" onClick={sendMessage} disabled={chatLoading || !input.trim()}>
                      <svg width="14" height="14" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* QURAN */}
            {activeTab === 'quran' && (
              <div className="fadein" style={{height:'100%'}}>
                {quranView === 'list' ? (
                  <div className="quran-shell">
                    <div className="quran-searchbar">
                      <input
                        className="qsearch"
                        placeholder="Search surah name or number..."
                        value={quranSearch}
                        onChange={e => setQuranSearch(e.target.value)}
                      />
                    </div>
                    <div className="surah-list">
                      {surahs.length === 0 && (
                        <div style={{padding:'20px',textAlign:'center',color:T.dim,fontSize:'0.82rem'}}>Loading surahs...</div>
                      )}
                      {filteredSurahs.map(s => (
                        <div key={s.number} className="surah-row" onClick={() => loadSurah(s)}>
                          <div className="surah-num">{s.number}</div>
                          <div className="surah-info">
                            <div className="surah-en">{s.englishName}</div>
                            <div className="surah-meta">{s.englishNameTranslation}  .  {s.numberOfAyahs} verses  .  {s.revelationType}</div>
                          </div>
                          <div className="surah-ar">{s.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="verses-shell fadein">
                    <audio ref={recitAudioRef}
                      onCanPlay={() => setRecitLoading(false)}
                      onEnded={() => setRecitPlaying(false)}
                      preload="none"
                    />
                    <div className="verses-header">
                      <button className="back-btn" onClick={() => { setQuranView('list'); setSurahVerses([]); stopRecitation(); }}>◂ Back</button>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'0.9rem',fontWeight:700,color:T.text}}>{selSurah?.englishName}</div>
                        <div style={{fontSize:'0.68rem',color:T.dim}}>{selSurah?.numberOfAyahs} verses  .  {selSurah?.revelationType}</div>
                      </div>
                      <div style={{fontFamily:"'Amiri', serif", fontSize:'1.3rem', color:T.accent, marginRight:'8px'}}>{selSurah?.name}</div>
                      {/* Recitation play button */}
                      <button
                        onClick={() => recitPlaying ? toggleRecitation() : playRecitation(selSurah?.number)}
                        title="Yasser Al-Dosari recitation"
                        style={{background:recitPlaying?T.accentLo:T.accent, border:'none', borderRadius:'50%', width:'34px', height:'34px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'0.95rem', flexShrink:0, transition:'all 0.15s'}}
                      >
                        {recitLoading ? '...' : recitPlaying ? '⏸' : '▶'}
                      </button>
                    </div>
                    <div className="verses-list">
                      {quranLoading && <div style={{textAlign:'center',padding:'20px',color:T.dim,fontSize:'0.82rem'}}>Loading verses...</div>}
                      {/* Bismillah header for all surahs except Al-Fatiha (1) and At-Tawbah (9) */}
                      {(!quranLoading) && (selSurah?.number !== 1) && (selSurah?.number !== 9) && (
                        <div style={{textAlign:'center', fontFamily:"'Amiri', serif", fontSize:'1.4rem', color:T.accent, padding:'12px 0 8px', borderBottom:`1px solid ${T.dim}22`, marginBottom:'8px'}}>
                          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </div>
                      )}
                      {surahVerses.map(v => (
                        <div key={v.number} className="verse-card">
                          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                            <div className="verse-num">{selSurah?.number !== 1 && selSurah?.number !== 9 ? v.number - 1 : v.number}</div>
                          </div>
                          <div className="verse-arabic">{v.arabic}</div>
                          <div className="verse-en">{v.english}</div>
                          <div className="verse-actions">
                            <button
                              className={`verse-btn${isBookmarked(selSurah?.number, v.number)?' bookmarked':''}`}
                              onClick={() => toggleBookmark(selSurah?.number, v.number)}
                            >
                              {isBookmarked(selSurah?.number, v.number) ? '★ Saved' : '☆ Save'}
                            </button>
                            <button
                              className={`verse-btn${audioPlaying && audioSrc?.includes(`/${String(selSurah?.number).padStart(3,'0')}${String(v.number).padStart(3,'0')}.mp3`) ? ' bookmarked' : ''}`}
                              onClick={() => audioPlaying && audioSrc?.includes(`/${String(selSurah?.number).padStart(3,'0')}${String(v.number).padStart(3,'0')}.mp3`) ? stopAudio() : playFromVerse(selSurah?.number, v.number)}
                            >
                              {audioPlaying && audioSrc?.includes(`/${String(selSurah?.number).padStart(3,'0')}${String(v.number).padStart(3,'0')}.mp3`) ? '■ Stop' : '▶ Listen'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DHIKR */}
            {activeTab === 'dhikr' && (
              <div className="dhikr-shell fadein">

                {/* Tasbih */}
                <div className="tasbih-side">
                  <div className="tasbih-label">Digital Tasbih</div>
                  <div className="tasbih-dhikr">{tasbeehLabel}</div>
                  <div className={`tasbih-count${tasbeehFlash?' flash':''}`}>{tasbeehCount}</div>
                  <div className="tasbih-target">Target: {tasbeehTarget}  .  Sets: {Math.floor(tasbeehCount/tasbeehTarget)}</div>
                  <button className="tasbih-tap-btn" onClick={tapTasbih}>TAP</button>
                  <div className="tasbih-controls">
                    <button className="tasbih-ctrl-btn" onClick={resetTasbih}>Reset</button>
                    <button className="tasbih-ctrl-btn" onClick={() => setTasbeehTarget(t => t===33?99:t===99?100:33)}>
                      {tasbeehTarget}x
                    </button>
                  </div>
                </div>

                {/* Right side: hadith + qibla + tracker */}
                <div className="hadith-side">
                  <div className="section-title">Hadith of the Day</div>
                  <div className="hadith-card">
                    <div className="hadith-text">"{hadith.text}"</div>
                    <div className="hadith-src">-- {hadith.source}</div>
                  </div>

                  <div className="section-title">Qibla Direction</div>
                  <div className="qibla-card">
                    <div className="qibla-compass">
                      <span className="qibla-arrow">🧭</span>
                    </div>
                    <div className="qibla-info">
                      <div className="qibla-deg">{DHAKA_QIBLA} deg</div>
                      <div className="qibla-label">from Dhaka, Bangladesh<br/>Face {DHAKA_QIBLA} deg from North</div>
                    </div>
                  </div>

                  <div className="section-title">Prayer Tracker</div>
                  <div className="prayer-tracker-card">
                    <div className="tracker-header">
                      <div className="section-title" style={{margin:0}}>Today's Prayers</div>
                      <div className="tracker-progress">{prayedCount}/5</div>
                    </div>
                    <div className="tracker-bar-bg">
                      <div className="tracker-bar-fill"/>
                    </div>
                    <div className="tracker-prayers">
                      {['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(name => (
                        <div key={name} className="tracker-row">
                          <div className="tracker-name">
                            {PRAYER_ICONS[name]} {name}
                          </div>
                          <div
                            className={`tracker-check${prayedToday[name]?' done':''}`}
                            onClick={() => togglePrayed(name)}
                          >
                            {prayedToday[name] ? '✓' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* DUAS */}
            {activeTab === 'duas' && (
              <div className="duas-shell fadein">
                {/* Ambient Player */}
                <audio ref={duaAudioRef} onEnded={onDuaEnded} preload="none" />
                <div style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:'14px', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0}}>
                  <div>
                    <div style={{fontSize:'0.72rem', fontWeight:700, color:T.accent, textTransform:'uppercase', letterSpacing:'0.08em'}}>Ambient Recitation</div>
                    <div style={{fontSize:'0.68rem', color:T.dim, marginTop:'2px'}}>Mishary Alafasy -- loops continuously</div>
                  </div>
                  <button
                    onClick={toggleDuaAmbient}
                    style={{background:duaPlaying?T.accentLo:T.accent, border:'none', borderRadius:'50%', width:'38px', height:'38px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'1.1rem', transition:'all 0.15s'}}
                  >
                    {duaPlaying ? '⏸' : '▶'}
                  </button>
                </div>
                <div className="section-title" style={{padding:'0 2px'}}>Daily Duas</div>
                {DUAS.map((dua, i) => (
                  <div key={i} className="dua-card">
                    <div className="dua-title">{dua.title}</div>
                    <div className="dua-arabic">{dua.arabic}</div>
                    <div className="dua-translation">{dua.translation}</div>
                  </div>
                ))}
                <div className="section-title" style={{padding:'8px 2px 0'}}>40 Rabbana Duas</div>
                {RABBANA_DUAS.map((dua, i) => (
                  <div key={i} className="dua-card">
                    <div className="dua-title">Rabbana #{i+1} · {dua.ref}</div>
                    <div className="dua-arabic">{dua.arabic}</div>
                    <div className="dua-translation">{dua.translation}</div>
                  </div>
                ))}
              </div>
            )}

            {/* SETTINGS */}
            {activeTab === 'settings' && (
              <div className="settings-shell fadein">
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Theme</div>
                    <div className="settings-sub">{isDark ? 'Dark mode -- blends with bezels' : 'Light mode'}</div>
                  </div>
                  <button className="toggle" onClick={() => setTheme(t => t==='dark'?'light':'dark')}/>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Location</div>
                    <div className="settings-sub">Prayer calculation city</div>
                  </div>
                  <div className="settings-value">{DHAKA.label}</div>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Calculation Method</div>
                    <div className="settings-sub">Islamic Foundation Bangladesh</div>
                  </div>
                  <div className="settings-value">Karachi / Hanafi</div>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Qibla Direction</div>
                    <div className="settings-sub">From Dhaka</div>
                  </div>
                  <div className="settings-value">{DHAKA_QIBLA} deg N</div>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Cache</div>
                    <div className="settings-sub">Prayer times cached for 6 hours</div>
                  </div>
                  <button
                    className="tasbih-ctrl-btn"
                    style={{fontSize:'0.7rem'}}
                    onClick={() => { localStorage.clear(); window.location.reload(); }}
                  >
                    Clear
                  </button>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Bookmarks</div>
                    <div className="settings-sub">Saved Quran verses</div>
                  </div>
                  <div className="settings-value">{bookmarks.length} saved</div>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Today's Prayers</div>
                    <div className="settings-sub">Prayer completion tracker</div>
                  </div>
                  <div className="settings-value">{prayedCount}/5 prayed</div>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Refresh App</div>
                    <div className="settings-sub">Reload the dashboard</div>
                  </div>
                  <button
                    className="tasbih-ctrl-btn"
                    style={{fontSize:'0.7rem', background:'#1a2a1a', borderColor:'#22c55e', color:'#22c55e'}}
                    onClick={() => window.location.reload()}
                  >
                    Refresh
                  </button>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Open Terminal</div>
                    <div className="settings-sub">Pi system terminal (kiosk)</div>
                  </div>
                  <button
                    className="tasbih-ctrl-btn"
                    style={{fontSize:'0.7rem', background:'#1a1a2a', borderColor:'#6366f1', color:'#6366f1'}}
                    onClick={() => { window.open('http://192.168.10.142:7681', '_blank'); }}
                  >
                    Terminal
                  </button>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-label">Lock Screen</div>
                    <div className="settings-sub">Return to login</div>
                  </div>
                  <button
                    className="tasbih-ctrl-btn"
                    style={{fontSize:'0.7rem', background:'#2a1a1a', borderColor:'#cc2244', color:'#cc2244'}}
                    onClick={() => { setAuthed(false); setLoginPass(''); setLoginUser(''); }}
                  >
                    Lock
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* ── BOTTOM NAV ── */}
          <div className="bottomnav">
            {[
              { id:'home',     icon:'~', label:'Home'    },
              { id:'quran',    icon:'Q', label:'Quran'   },
              { id:'dhikr',    icon:'O', label:'Dhikr'   },
              { id:'duas',     icon:'+', label:'Du\'as'  },
              { id:'settings', icon:'=', label:'Settings'},
            ].map(tab => (
              <div
                key={tab.id}
                className={`navitem${activeTab===tab.id?' active':''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="nav-icon">{tab.icon}</span>
                {tab.label}
              </div>
            ))}
          </div>

        </div>
      </div>
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          autoPlay
          onEnded={stopAudio}
          style={{display:'none'}}
        />
      )}
    </>
  );
}
