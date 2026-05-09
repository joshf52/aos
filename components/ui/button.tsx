import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const base =
  "group relative inline-flex items-center justify-center gap-2 rounded-[18px] " +
  "font-semibold tracking-[-0.01em] transition-[transform,box-shadow,border-color,color] " +
  "duration-300 active:scale-[0.99] focus-visible:outline-none disabled:opacity-50 " +
  "disabled:pointer-events-none";

const variantClasses = {
  primary:
    "bg-gradient-to-b from-aos-gold to-[#B8895A] text-aos-bg " +
    "shadow-[0_1px_0_rgba(245,232,210,0.4)_inset,0_12px_30px_rgba(212,165,116,0.25)] " +
    "hover:shadow-[0_1px_0_rgba(245,232,210,0.5)_inset,0_18px_40px_rgba(212,165,116,0.35)]",
  secondary:
    "bg-aos-elevated text-aos-text border border-aos-border hover:border-aos-border-strong",
  ghost:
    "bg-transparent text-aos-secondary border border-aos-border " +
    "hover:text-aos-text hover:border-aos-border-strong",
  gold:
    "bg-gradient-to-b from-aos-gold to-[#B8895A] text-aos-bg " +
    "shadow-[0_1px_0_rgba(245,232,210,0.4)_inset,0_12px_30px_rgba(212,165,116,0.25)] " +
    "hover:shadow-[0_1px_0_rgba(245,232,210,0.5)_inset,0_18px_40px_rgba(212,165,116,0.35)]",
} as const;

const sizeClasses = {
  sm: "px-4 py-2.5 text-[13px]",
  md: "px-5 py-3 text-[14px]",
  lg: "px-6 py-4 text-[15px]",
} as const;

type Variant = keyof typeof variantClasses;
type Size = keyof typeof sizeClasses;

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
  prefetch?: boolean;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";
  const classes = cn(base, variantClasses[variant], sizeClasses[size], props.className);

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        target={props.target}
        rel={props.rel}
        prefetch={props.prefetch}
        className={classes}
      >
        {props.children}
      </Link>
    );
  }

  const buttonProps = props as ButtonAsButton;
  return (
    <button
      className={classes}
      type={buttonProps.type}
      onClick={buttonProps.onClick}
      disabled={buttonProps.disabled}
      name={buttonProps.name}
      value={buttonProps.value}
      form={buttonProps.form}
      formAction={buttonProps.formAction}
      aria-label={buttonProps["aria-label"]}
      aria-disabled={buttonProps["aria-disabled"]}
    >
      {buttonProps.children}
    </button>
  );
}
