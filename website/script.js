const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-navigation");
const moreButton = document.querySelector(".more-toggle");
const moreContainer = document.querySelector(".nav-more");

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  navigation?.classList.toggle("open", !isOpen);
});

moreButton?.addEventListener("click", () => {
  const isOpen = moreButton.getAttribute("aria-expanded") === "true";
  moreButton.setAttribute("aria-expanded", String(!isOpen));
  moreContainer?.classList.toggle("open", !isOpen);
});

document.addEventListener("click", (event) => {
  if (moreContainer && !moreContainer.contains(event.target)) {
    moreContainer.classList.remove("open");
    moreButton?.setAttribute("aria-expanded", "false");
  }
});

document.querySelectorAll(".main-navigation a").forEach((link) => {
  link.addEventListener("click", () => {
    navigation?.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

const year = document.querySelector("#current-year");
if (year) year.textContent = String(new Date().getFullYear());