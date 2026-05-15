export type ScaffoldType = "mod" | "block" | "local" | "report";

export interface ScaffoldFile {
  path: string;
  content: string;
}

const HEADER = "<?php\n// AUTO-GENERATED scaffold — adapt as needed.\n";

export function buildScaffold(type: ScaffoldType, name: string): ScaffoldFile[] {
  switch (type) {
    case "mod":
      return [
        { path: `mod/${name}/version.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n$plugin->component = 'mod_${name}';\n$plugin->version = 2026010100;\n$plugin->requires = 2024042200;\n` },
        { path: `mod/${name}/lib.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n\nfunction ${name}_add_instance(stdClass $data, mod_${name}_mod_form $mform = null): int {\n    return 0;\n}\n` },
        { path: `mod/${name}/db/install.xml`, content: `<?xml version="1.0" encoding="UTF-8" ?>\n<XMLDB PATH="mod/${name}/db" VERSION="2026010100">\n  <TABLES>\n    <TABLE NAME="${name}" COMMENT="${name} instances">\n      <FIELDS>\n        <FIELD NAME="id" TYPE="int" LENGTH="10" NOTNULL="true" SEQUENCE="true"/>\n        <FIELD NAME="course" TYPE="int" LENGTH="10" NOTNULL="true"/>\n        <FIELD NAME="name" TYPE="char" LENGTH="255" NOTNULL="true"/>\n      </FIELDS>\n      <KEYS>\n        <KEY NAME="primary" TYPE="primary" FIELDS="id"/>\n      </KEYS>\n    </TABLE>\n  </TABLES>\n</XMLDB>\n` },
        { path: `mod/${name}/lang/en/${name}.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n$string['pluginname'] = '${name}';\n` },
      ];
    case "block":
      return [
        { path: `blocks/${name}/version.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n$plugin->component = 'block_${name}';\n$plugin->version = 2026010100;\n` },
        { path: `blocks/${name}/block_${name}.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n\nclass block_${name} extends block_base {\n    public function init() {\n        $this->title = get_string('pluginname', 'block_${name}');\n    }\n}\n` },
        { path: `blocks/${name}/lang/en/block_${name}.php`, content: `${HEADER}$string['pluginname'] = '${name}';\n` },
      ];
    case "local":
      return [
        { path: `local/${name}/version.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n$plugin->component = 'local_${name}';\n$plugin->version = 2026010100;\n` },
        { path: `local/${name}/lang/en/local_${name}.php`, content: `${HEADER}$string['pluginname'] = '${name}';\n` },
      ];
    case "report":
      return [
        { path: `report/${name}/version.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n$plugin->component = 'report_${name}';\n$plugin->version = 2026010100;\n` },
        { path: `report/${name}/index.php`, content: `${HEADER}require(__DIR__ . '/../../config.php');\nrequire_login();\n` },
        { path: `report/${name}/lang/en/report_${name}.php`, content: `${HEADER}$string['pluginname'] = '${name}';\n` },
      ];
  }
}
