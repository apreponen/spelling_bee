import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import App from "./App.vue";
import { resetGame } from "./game/store";

// A small word list and schedule of our own, so that editing the real word list
// or making a new schedule never breaks these tests. On 2026-11-25 the puzzle is
// "d:adehitv": center D, other letters A E H I T V, 10 words, 50 points.
const WORDS = [
  "ahde",
  "data",
  "deitti",
  "hede",
  "idea",
  "sähkö",
  "sähköisku",
  "taide",
  "tiede",
  "vaihde",
  "vaihdettava",
  "viihde",
];
const SCHEDULE = { epoch: "2026-11-24", puzzles: ["ä:hiksuäö", "d:adehitv"] };

function press(key: string, code = "") {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, code, bubbles: true }));
}

async function typeWord(word: string) {
  for (const letter of word) press(letter);
  press("Enter");
  await nextTick();
}

let wrapper: VueWrapper;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  resetGame({ words: WORDS, schedule: SCHEDULE, now: () => new Date("2026-11-25T12:00:00"), storage: null });
  wrapper = mount(App, { attachTo: document.body });
});

afterEach(() => {
  wrapper.unmount();
  vi.useRealTimers();
});

describe("the app", () => {
  it("shows today's date and letters, with the center letter first", () => {
    expect(wrapper.find(".date .long").text()).toBe("keskiviikkona 25. marraskuuta 2026");
    const letters = wrapper.findAll(".cell .label").map((node) => node.text());
    expect(letters[0]).toBe("D");
    expect([...letters].sort()).toEqual(["A", "D", "E", "H", "I", "T", "V"]);
  });

  it("accepts words typed on the keyboard", async () => {
    expect(wrapper.find(".rank-name").text()).toBe("Aloittelija");
    await typeWord("idea");
    expect(wrapper.find(".toast").text()).toBe("Hyvä!+1");
    expect(wrapper.findAll(".word-list li").map((li) => li.text())).toEqual(["idea"]);
    expect(wrapper.find(".rank-name").text()).toBe("Hyvä alku");

    await typeWord("vaihdettava");
    expect(wrapper.find(".toast").text()).toBe("Pangrammi!+18");
    expect(wrapper.find(".rank-name").text()).toBe("Mainio");
    expect(wrapper.find(".dot.current .score").text()).toBe("19");
  });

  it("explains why a word is rejected, then clears it", async () => {
    await typeWord("dad");
    expect(wrapper.find(".toast").text()).toBe("Liian lyhyt");
    expect(wrapper.find(".guess").text()).toBe("DAD");
    vi.advanceTimersByTime(800);
    await nextTick();
    expect(wrapper.find(".guess").text()).toBe("");

    await typeWord("tieto");
    expect(wrapper.find(".toast").text()).toBe("Vääriä kirjaimia");
    press("a"); // typing straight away starts a fresh word
    await nextTick();
    expect(wrapper.find(".guess").text()).toBe("A");
    press("Backspace");

    await typeWord("ahdi");
    expect(wrapper.find(".toast").text()).toBe("Ei sanalistassa");
  });

  it("submits with Enter even if a button has keyboard focus", async () => {
    const button = wrapper.find('button[title="Vihjeet"]').element as HTMLButtonElement;
    button.focus();
    const keydown = (key: string) =>
      button.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    for (const letter of "idea") keydown(letter);
    expect(keydown("Enter")).toBe(false); // the browser's default (pressing the button) is cancelled
    await nextTick();
    expect(wrapper.findAll(".word-list li").map((li) => li.text())).toEqual(["idea"]);
  });

  it("types Ä and Ö from the matching keys of an English keyboard", async () => {
    press("'", "Quote");
    press(";", "Semicolon");
    await nextTick();
    expect(wrapper.find(".guess").text()).toBe("ÄÖ");
  });

  it("adds a letter when a cell of the hive is clicked, and deletes with Poista", async () => {
    await wrapper.findAll(".cell")[0].trigger("click");
    await wrapper.findAll(".cell")[0].trigger("click");
    expect(wrapper.find(".guess").text()).toBe("DD");
    await wrapper.findAll(".control")[0].trigger("click");
    expect(wrapper.find(".guess").text()).toBe("D");
  });

  it("opens the hints", async () => {
    await typeWord("idea");
    await wrapper.find('button[title="Vihjeet"]').trigger("click");
    const dialog = document.querySelector("dialog");
    expect(dialog?.textContent).toContain("Alkukirjain ja pituus");
    expect(dialog?.textContent).toContain("10 sanaa");
    expect(dialog?.textContent).toContain("Löytämättä 9 sanaa ja 49 pistettä.");
  });

  it("explains the rules with an example and links to the third-party licenses", async () => {
    await wrapper.find('button[title="Ohjeet"]').trigger("click");
    const dialog = document.querySelector("dialog")!;
    expect(dialog.textContent).toContain("Kalusto käyttää kaikkia seitsemää kirjainta");
    expect(dialog.querySelector('a[href="third-party-licenses.txt"]')).not.toBeNull();
  });

  it("shows yesterday's answers", async () => {
    await wrapper.find('button[title="Eilinen"]').trigger("click");
    const dialog = document.querySelector("dialog");
    expect(dialog?.textContent).toContain("tiistaina 24. marraskuuta 2026");
    expect(dialog?.textContent).toContain("sähköisku");
  });

  it("lists the ranks up to Nero and keeps the top rank a secret", async () => {
    await wrapper.find(".rankbar").trigger("click");
    const rows = [...document.querySelectorAll("dialog tbody tr")].map((row) => row.textContent?.trim());
    expect(rows).toHaveLength(9);
    expect(rows[0]).toBe("Aloittelija0");
    expect(rows[8]).toBe("Nero35");
    expect(document.querySelector("dialog")?.textContent?.toLowerCase()).not.toContain("kuningatar");
  });

  it("celebrates reaching Nero without revealing the secret rank", async () => {
    for (const word of ["vaihdettava", "deitti", "vaihde", "viihde"]) await typeWord(word); // 36 points
    vi.advanceTimersByTime(1000);
    await nextTick();
    const dialog = document.querySelector("dialog");
    expect(dialog?.querySelector("h2")?.textContent).toBe("Nero!");
    expect(dialog?.textContent?.toLowerCase()).not.toContain("kuningatar");
  });

  it("celebrates finding every word with the secret top rank", async () => {
    const all = ["ahde", "data", "deitti", "hede", "idea", "taide", "tiede", "vaihde", "vaihdettava", "viihde"];
    for (const word of all) await typeWord(word);
    vi.advanceTimersByTime(1000);
    await nextTick();
    expect(document.querySelector("dialog h2")?.textContent).toBe("Kuningatar!");
    expect(wrapper.find(".rank-name").text()).toBe("Kuningatar");
  });
});
