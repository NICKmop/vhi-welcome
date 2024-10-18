let logoCot = document.getElementById("logo-content");

document.getElementById("val_img").addEventListener("click", function (evt) {
    console.log(evt.target.id)

    logoCot.style.bottom = '35%';
    logoCot.style.left = '-30%';
    logoCot.style.width = '15%';
    logoCot.style.height = '10%';

    document.getElementById("method").style.visibility = 'visible';
})