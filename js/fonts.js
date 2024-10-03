var html = document.documentElement;

var fontsfile = document.createElement('link');
fontsfile.href = pathTemplate + 'css/fonts.css';
fontsfile.rel = 'stylesheet';
document.head.appendChild(fontsfile);

if (sessionStorage.fontsLoaded) {
    html.classList.add('fonts-loaded');
} else {
    var script = document.createElement('script');
    script.src = pathTemplate + 'js/fontfaceobserver.js';
    script.async = true;

    script.onload = function () {
        var font300 = new FontFaceObserver('Gilroy', {
            weight: '300'
        });
        var font400 = new FontFaceObserver('Gilroy', {
            weight: 'normal'
        });
        var font500 = new FontFaceObserver('Gilroy', {
            weight: '500'
        });
        var font600 = new FontFaceObserver('Gilroy', {
            weight: '600'
        });
        var font700 = new FontFaceObserver('Gilroy', {
            weight: 'bold'
        });

        Promise.all([
            font300.load(),
            font400.load(),
            font500.load(),
            font600.load(),
            font700.load()
        ]).then(function () {
            html.classList.add('fonts-loaded');
            sessionStorage.fontsLoaded = true;
        });
    };
    document.head.appendChild(script);
}