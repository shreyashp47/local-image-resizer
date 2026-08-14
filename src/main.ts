import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = `
    <header>
      <h1>Local Image Resizer</h1>
      <p>Coming soon — resize images entirely in your browser, nothing is ever uploaded.</p>
    </header>
  `;
}
