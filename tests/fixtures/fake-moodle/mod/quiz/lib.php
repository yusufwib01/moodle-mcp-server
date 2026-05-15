<?php
// Fake mod_quiz lib.
function quiz_add_instance(stdClass $data): int {
    return fake_get_records('quiz');
}
