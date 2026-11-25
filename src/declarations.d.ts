// Guía: Declara el tipo de los recursos JSON importados en TypeScript.

declare module "*.json" {
  const value: any;
  export default value;
}
