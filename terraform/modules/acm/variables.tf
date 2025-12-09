variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
}

variable "domain_name" {
  description = "Primary domain name for the certificate"
  type        = string
}

variable "subject_alternative_names" {
  description = "List of additional domain names (SANs) for the certificate"
  type        = list(string)
  default     = []
}

variable "wait_for_validation" {
  description = "Whether to wait for certificate validation to complete"
  type        = bool
  default     = false
}

variable "create_route53_validation_records" {
  description = "Whether to create Route53 records for validation (requires Route53 zone)"
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID (required if create_route53_validation_records is true)"
  type        = string
  default     = ""
}



