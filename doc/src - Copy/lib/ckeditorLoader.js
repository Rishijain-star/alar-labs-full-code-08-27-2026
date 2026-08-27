let ckeditorPromise = null;

export function loadCKEditor() {
    if (typeof window === "undefined") return Promise.reject();

    // already loaded
    if (window.ClassicEditor) {
        return Promise.resolve(window.ClassicEditor);
    }

    // already loading
    if (ckeditorPromise) {
        return ckeditorPromise;
    }

    ckeditorPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.ckeditor.com/ckeditor5/41.4.2/classic/ckeditor.js";
        script.async = true;

        script.onload = () => {
            if (window.ClassicEditor) resolve(window.ClassicEditor);
            else reject();
        };

        script.onerror = reject;
        document.head.appendChild(script);
    });

    return ckeditorPromise;
}