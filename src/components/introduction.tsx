import "../components/intro.css";

export const Intro = () => {
  return (
    <div className="intro-main">
      <div className="intro-me">
        <a href="https://git.io/typing-svg" target="_blank" rel="noopener noreferrer">
          <img
            src="https://readme-typing-svg.demolab.com/?lines=Developed+By;%3C%2FMd+Mahbub+Tanmay%3E&center=true&width=200&height=25&duration=5000&color=4B0082&size=15"
            alt="Typing SVG"
          />
        </a>

        <p>Dept. of Software Engineering, UFTB</p>
      </div>

      <div className="intro-social">
        <a
          href="https://github.com/MdMahbubTanmay"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>

        <a
          href="https://www.facebook.com/MdMahbubTanmay"
          target="_blank"
          rel="noopener noreferrer"
        >
          Facebook
        </a>

        <a
          href="https://www.linkedin.com/in/mdmahbubtanmay"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
      </div>
    </div>
  );
};
