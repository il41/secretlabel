(function () {
  var splash = document.getElementById("splash");
  var letterS = document.getElementById("letter-s");
  var letterL = document.getElementById("letter-l");

  splash.addEventListener("click", function () {
    letterS.classList.add("fall-left");
    letterL.classList.add("fall-right");

    setTimeout(function () {
      splash.classList.add("done");
      document.getElementById("site").classList.remove("hidden");
    }, 700);
  });
})();
