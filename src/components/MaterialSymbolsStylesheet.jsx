// Loads the Material Symbols icon font for the internal areas (admin, affiliate,
// portal) that still use `.material-symbols-outlined`. Public pages use Lucide via
// components/Icon.jsx and deliberately load no icon font.
//
// React hoists these <link> elements into <head>, so they work from a nested layout.
export default function MaterialSymbolsStylesheet() {
    return (
        <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
                href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                rel="stylesheet"
            />
        </>
    );
}
