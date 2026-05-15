<?php
$callbacks = [
    [
        'hook' => \core\hook\after_config::class,
        'callback' => 'mod_quiz\\hook_listener::after_config',
    ],
];
