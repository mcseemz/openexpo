export const ValidName =  customName =>  {
  return (customName) ? /[1234567890<>;{}$']/ : /[1234567890<>;{}$]/;
}
