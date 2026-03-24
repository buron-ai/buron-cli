import chalk from "chalk";
import ora, { type Ora } from "ora";

export function success(message: string): void {
  console.log(`${chalk.green("✓")} ${message}`);
}

export function error(message: string): void {
  console.error(`${chalk.red("✗")} ${message}`);
}

export function info(message: string): void {
  console.log(chalk.dim(message));
}

export function warn(message: string): void {
  console.log(`${chalk.yellow("!")} ${message}`);
}

export function link(url: string): string {
  return chalk.cyan.underline(url);
}

export function bold(text: string): string {
  return chalk.bold(text);
}

export function dim(text: string): string {
  return chalk.dim(text);
}

export function spinner(text: string): Ora {
  return ora({ text, color: "white" });
}

export function blank(): void {
  console.log();
}

export function fatal(message: string): never {
  error(message);
  process.exit(1);
}

export function banner(version: string): void {
  const art = chalk.bold(`
  ██████╗ ██╗   ██╗██████╗  ██████╗ ███╗   ██╗
  ██╔══██╗██║   ██║██╔══██╗██╔═══██╗████╗  ██║
  ██████╔╝██║   ██║██████╔╝██║   ██║██╔██╗ ██║
  ██╔══██╗██║   ██║██╔══██╗██║   ██║██║╚██╗██║
  ██████╔╝╚██████╔╝██║  ██║╚██████╔╝██║ ╚████║
  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝`);

  console.log(art);
  console.log(chalk.dim(`  v${version}\n`));
}
