/**
 * Attribute passed to the certificate as OID 1.2.3.4.5.6.7.8.1
 */
export interface EnrollAttribute {
  name: string;
  value: string;
  required?: boolean;
}
