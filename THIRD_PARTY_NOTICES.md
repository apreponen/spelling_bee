# Third-party material

All of Sanakenno's own code was written for this project, and its license is yours to choose
(see [README](README.md#license)). These parts come from others and keep their own terms:

| What | Where | Shipped to players? | Terms |
| --- | --- | --- | --- |
| Kotus *Nykysuomen sanalista 2022* | `data/nykysuomensanalista2022.csv` (unchanged); filtered into `src/data/words.txt` | Yes, the filtered list | Credit Kotus. Check the license on the Kotus page you downloaded the list from. |
| [Vue](https://vuejs.org/) | `node_modules/vue` | Yes, inside the built JavaScript | MIT License, Copyright (c) 2018-present Yuxi (Evan) You |
| [wordfreq](https://github.com/rspeer/wordfreq) | Installed by `requirements.txt` | No, used only by `scripts/build_data.py` to choose puzzles | Code Apache-2.0; data CC BY-SA 4.0 |
| Vite, Vitest, TypeScript, vue-tsc, happy-dom, Vue Test Utils, pytest | `node_modules`, Python packages | No, build and test tools only | Their own open-source licenses |

`public/third-party-licenses.txt` is copied into every build of the game. It credits Kotus and
contains Vue's license, which the MIT License asks you to keep with copies of Vue. The game's
"Ohjeet" window links to it. If you add other libraries to the game, add their licenses there too.
