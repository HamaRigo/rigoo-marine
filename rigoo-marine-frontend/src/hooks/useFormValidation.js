import { useState, useCallback } from 'react';

/**
 * Lightweight form validation hook.
 *
 * @param {Record<string, Function|Function[]>} rules
 *   Object keyed by field name. Value is a single validator or array of validators.
 *   Each validator: (value, allValues?) => string | null
 *
 * @example
 *   const { touch, revalidate, validateAll, fieldError, reset } = useFormValidation({
 *     name:  [required, nameMin],
 *     email: [required, email],
 *   });
 *
 *   // In TextField:
 *   onBlur={() => touch('name', formData.name)}
 *   onChange={(e) => { setName(e.target.value); revalidate('name', e.target.value); }}
 *   error={!!fieldError('name')}
 *   helperText={fieldError('name') ? tv(fieldError('name')) : undefined}
 *
 *   // On submit:
 *   if (!validateAll(formData)) return;
 */
export function useFormValidation(rules) {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const runField = useCallback((name, value, allValues) => {
    const validators = rules[name];
    if (!validators) return null;
    const fns = Array.isArray(validators) ? validators : [validators];
    for (const fn of fns) {
      const err = fn(value, allValues);
      if (err) return err;
    }
    return null;
  }, [rules]);

  /** Mark field as touched (on blur) and validate immediately. */
  const touch = useCallback((name, value, allValues) => {
    setTouched(t => ({ ...t, [name]: true }));
    setErrors(e => ({ ...e, [name]: runField(name, value ?? '', allValues) }));
  }, [runField]);

  /** Re-run validation for a field while typing (only if already touched). */
  const revalidate = useCallback((name, value, allValues) => {
    setTouched(prev => {
      if (!prev[name]) return prev;
      setErrors(e => ({ ...e, [name]: runField(name, value ?? '', allValues) }));
      return prev;
    });
  }, [runField]);

  /** Validate all fields at once (call on submit). Returns true if no errors. */
  const validateAll = useCallback((values) => {
    setSubmitAttempted(true);
    const newErrors = {};
    const allTouched = {};
    let valid = true;
    for (const name of Object.keys(rules)) {
      const err = runField(name, values[name] ?? '', values);
      newErrors[name] = err;
      allTouched[name] = true;
      if (err) valid = false;
    }
    setErrors(newErrors);
    setTouched(allTouched);
    return valid;
  }, [rules, runField]);

  /** Error key for a field (only visible after touch or submit attempt). */
  const fieldError = useCallback((name) => {
    if (!touched[name] && !submitAttempted) return null;
    return errors[name] || null;
  }, [errors, touched, submitAttempted]);

  /** Clear all validation state (call when dialog reopens or form resets). */
  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
    setSubmitAttempted(false);
  }, []);

  return { touch, revalidate, validateAll, fieldError, reset };
}
