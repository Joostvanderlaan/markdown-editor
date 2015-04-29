<?php
class MarkdownEditorOnBeforeDocFormSave extends MarkdownEditorPlugin {
    public function process() {
        /** @var modResource $resource */
        $resource = $this->scriptProperties['resource'];
        $resourceArray = $resource->toArray();

        foreach ($resourceArray as $field => $v) {
            if (!strpos($field, '_markdown')) continue;
            $fieldName = str_replace('_markdown', '', $field);
            $content = $resource->get($field);

            $content = $this->embedContent($content);

            $resource->set($fieldName, $content);
        }

        return;
    }
    
    protected function embedContent($content) {
        $fences = array();
        preg_match_all('~<code.+?(?=</code>)</code>~s', $content, $fences);

        $clearedContent = $content;
        if (isset($fences[0])) {
            foreach ($fences[0] as $value) {
                $clearedContent = str_replace($value, '', $clearedContent);
            }
        }

        $matches = array();
        preg_match_all('/\[embed ([^\] ]+)\]/', $clearedContent, $matches);

        if (isset($matches[1])) {
            foreach ($matches[1] as $key => $url) {
                $html = $this->modx->markdowneditor->getOEmbed($url);

                $content = str_replace($matches[0][$key], $html, $content);
            }
        }

        return $content;
    }
}
