import { pinBuildings } from '../../testing/pinnedArt.testkit';

/*
 * Pixel-identity guard for the French building art: every building
 * type x age and every Wonder stage (testing/pinnedArt.testkit.ts), so
 * later civs' kit and family changes cannot silently change French.
 * wall@1-3 re-recorded in M5 Task 6, when French got its own wall styles
 * (the wall building type paints a wall piece); wall@3 again in its
 * polish round (taller échauguettes). Fix round 1 re-recorded the age-1
 * set (steeper slate, porticus kit), town_center@2 (bays clear of the
 * turrets), town_center@3 and tower@3 (no hidden glazing or dormers).
 * M5 final review I1: the styles drop hidden window glows (dropHiddenGlows,
 * lighting/glowCover.ts), so every painting with a window glowing behind a
 * later solid was re-recorded (its glow list shrank; draw log unchanged).
 */

pinBuildings('french', {
  'town_center@1': '4fe7f224cf281c3d',
  'house@1': 'c9a2bf4e6acc18a5',
  'farm@1': '03513f730bdd1cbb',
  'lumber_camp@1': 'a4e7b030ce1f8e36',
  'mining_camp@1': '6eddddba6f7deee8',
  'barracks@1': '2372586c341d4c62',
  'archery_range@1': 'deec7558c8002d4b',
  'stable@1': '33ac4d8209e0def7',
  'blacksmith@1': 'b4f7700e32f9bf69',
  'foundry@1': 'f55a1094a5308c76',
  'tower@1': '5a1f0c50721ed531',
  'wall@1': '72a41ffc81c8f738',
  'wonder@1': 'b0d194d9cdfe286b',
  'town_center@2': '92f3bdbf50c212d7',
  'house@2': '4948160e5866ada1',
  'farm@2': 'f76b6f47cd9f8579',
  'lumber_camp@2': '4fafb8a446e614d2',
  'mining_camp@2': '962fb9f6eeca9078',
  'barracks@2': 'ce43486a8da1d7ea',
  'archery_range@2': '5e91f6aa646adb5d',
  'stable@2': '340a3cfe733c9955',
  'blacksmith@2': '76cb68a40ab88b20',
  'foundry@2': 'aeeac1e0485051e9',
  'tower@2': 'd49a8cb18ac4bab9',
  'wall@2': 'ae79f380835414ef',
  'wonder@2': '08809022b26177a1',
  'town_center@3': '90b9c7d0e3c4d7a8',
  'house@3': '82899c74be072c9b',
  'farm@3': '9289228fd69e4f58',
  'lumber_camp@3': '0b0b593217d59025',
  'mining_camp@3': '39f187b83d93680b',
  'barracks@3': '55d34949d07f0f61',
  'archery_range@3': '65559c326b353fe0',
  'stable@3': 'b0913538b17a0e34',
  'blacksmith@3': '66fb91695ac9c7e8',
  'foundry@3': '233e63e0ea7b8683',
  'tower@3': '2cb3f5bdd365879d',
  'wall@3': '2bbbcbfc8fcc147c',
  'wonder@3': '5353038176818c26',
  'wonder~s1': '57fa9a732f04b99b',
  'wonder~s2': 'cb4ab7b5bfefaa35',
  'wonder~s3': '64fc2c15ae30d782',
});
