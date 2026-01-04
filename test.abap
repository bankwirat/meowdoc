FORM my_form.
  WRITE 'Hello world'.
ENDFORM.

FORM another_form.
  PERFORM my_form.
ENDFORM.
