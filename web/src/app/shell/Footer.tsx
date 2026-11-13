import { shellStrings } from "../strings";

/** Pie de una línea. No declara estados que no haya consultado. */
export default function Footer() {
  return (
    <footer className="shell-footer">
      <span>
        © {new Date().getFullYear()} {shellStrings.brand}
      </span>
      <span className="hidden sm:inline">
        Todo en su lugar. Todo fluye mejor.
      </span>
    </footer>
  );
}
