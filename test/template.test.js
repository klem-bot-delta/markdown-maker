const util = require("./tester.test.js");
const fs = require("fs");

/* 
describe("Managing blank lines", () => {
    it("should always end with 2 blank lines, even with no input", () => {
        const output = new util.Parser("").get();
        util.assert.strictEqual(output, "\n\n")
    });

*/
describe("Use of templates", () => {
    it("should import templates as expected", () => {
        const output = new util.Parser("#mdtemplate<presentation>").get();
        const template = `<style>html {width: 100vw;height: 100vh;}.slide {padding: 5%;border-radius: 25px;margin: 0;}div > .slide-num {position: absolute;top: 12.5%;right: 15%;/* font-size: 150%; */}body {margin: 5% 15%;}img {max-width: 100%;max-height: 40vh;}</style><script>document.addEventListener("DOMContentLoaded", () => {let current_slide = 0;const all_slides = document.querySelectorAll("div.slide");const num_slides = all_slides.length;all_slides.forEach((slide) => {const num_elem = document.createElement("p");num_elem.classList.add("slide-num");slide.appendChild(num_elem);});onkeydown = (ev) => {if (ev.key == "ArrowRight" && current_slide < all_slides.length - 1)update_slide(++current_slide);else if (ev.key == "ArrowLeft" && current_slide > 0)update_slide(--current_slide);};const update_slide = (index) => {all_slides.forEach((slide) => (slide.style.display = "none"));all_slides[current_slide].style.display = "block";all_slides[current_slide].lastChild.textContent = \`\${current_slide + 1} / \${num_slides}\`;};update_slide(current_slide);});</script>`;

        util.assert.strictEqual(output, template + "\n\n");
    });
});
