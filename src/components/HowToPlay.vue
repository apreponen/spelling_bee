<script setup lang="ts">
// The rules, with a worked example. The example letters (K + A L O S T U) are
// not one of the scheduled puzzles, so the example never spoils a game.
import LetterRow from "./LetterRow.vue";

const EXAMPLE_CENTER = "k";
const EXAMPLE_LETTERS = ["a", "k", "l", "o", "s", "t", "u"];
</script>

<template>
  <div class="help">
    <p class="lead">
      Joka päivä kennossa on seitsemän uutta kirjainta. Keksi niistä niin monta suomen kielen sanaa kuin osaat.
    </p>

    <h3>Esimerkki</h3>
    <LetterRow :center="EXAMPLE_CENTER" :letters="EXAMPLE_LETTERS" />
    <p>
      Keltainen K on keskikirjain, ja sen täytyy olla jokaisessa sanassa. Esimerkiksi <b>kala</b>, <b>kulta</b> ja
      <b>sukka</b> käyvät, mutta <i>talo</i> ei, koska siinä ei ole K:ta. <b>Kalusto</b> käyttää kaikkia seitsemää
      kirjainta, joten se on <b>pangrammi</b>.
    </p>

    <h3>Säännöt</h3>
    <ul>
      <li>Sanassa on vähintään neljä kirjainta.</li>
      <li>Sama kirjain saa toistua, kuten sanassa <b>sukka</b>.</li>
      <li>
        Sanan pitää olla sanakirjamuodossa: <b>talo</b> käy, mutta <i>talossa</i> ja <i>talot</i> eivät. Verbeistä
        käy perusmuoto, esimerkiksi <b>juosta</b>.
      </li>
      <li>
        Yhdyssanat käyvät, jos ne ovat sanalistassa. Samoin listan adverbit, kuten <b>ulkona</b> ja <b>päällä</b>.
      </li>
      <li>Erisnimet, lyhenteet ja yhdysmerkilliset sanat eivät käy.</li>
    </ul>

    <h3>Pisteet</h3>
    <table class="scoring">
      <tbody>
        <tr>
          <th scope="row">Neljän kirjaimen sana</th>
          <td>1 piste</td>
          <td class="example">kala = 1</td>
        </tr>
        <tr>
          <th scope="row">Pidempi sana</th>
          <td>piste kirjainta kohden</td>
          <td class="example">kulta = 5</td>
        </tr>
        <tr>
          <th scope="row">Pangrammi</th>
          <td>7 lisäpistettä</td>
          <td class="example">kalusto = 7 + 7</td>
        </tr>
      </tbody>
    </table>
    <p>
      Jokaisesta kennosta löytyy ainakin yksi pangrammi. Kun pisteitä kertyy, tasosi nousee. Tasot näet
      napauttamalla edistymispalkkia.
    </p>

    <h3>Näppäimistöllä</h3>
    <p>
      Voit kirjoittaa myös näppäimistöllä: <kbd>Enter</kbd> syöttää sanan, askelpalautin pyyhkii viimeisen
      kirjaimen ja välilyönti sekoittaa kirjaimet.
    </p>

    <h3>Tietoja</h3>
    <p class="small">
      Sanat: Kotimaisten kielten keskus (Kotus),
      <a href="https://kotus.fi/" target="_blank" rel="noopener">Nykysuomen sanalista 2022</a>. Listasta on jätetty
      pois monisanaiset ilmaukset, yhdysmerkilliset sanat, lyhenteet sekä loukkaavat ja rivot sanat.
      <a href="third-party-licenses.txt" target="_blank" rel="noopener">Muiden osien lisenssit</a>
    </p>
  </div>
</template>

<style scoped>
.help h3 {
  margin: 20px 0 6px;
  font-size: 1rem;
}
.help ul {
  margin: 0;
  padding-left: 1.2em;
}
.help li {
  margin: 4px 0;
}
.lead {
  margin-top: 0;
  font-weight: 600;
}
.scoring {
  width: 100%;
  border-collapse: collapse;
}
.scoring th,
.scoring td {
  padding: 6px 8px 6px 0;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}
.scoring th {
  font-weight: 600;
}
.scoring .example {
  color: var(--muted);
  white-space: nowrap;
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.03em;
}
.small {
  font-size: 0.9rem;
  color: var(--muted);
}
kbd {
  padding: 1px 5px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.85em;
}
</style>
