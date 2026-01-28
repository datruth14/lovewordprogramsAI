'use client';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
    ClassicEditor,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Heading,
    Paragraph,
    List,
    BlockQuote,
    Alignment,
    Indent,
    IndentBlock,
    Undo,
    Essentials,
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    return (
        <div className="ckeditor-container">
            <CKEditor
                editor={ClassicEditor}
                data={value}
                config={{
                    licenseKey: 'GPL',
                    plugins: [
                        Essentials,
                        Bold,
                        Italic,
                        Underline,
                        Strikethrough,
                        Heading,
                        Paragraph,
                        List,
                        BlockQuote,
                        Alignment,
                        Indent,
                        IndentBlock,
                        Undo,
                    ],
                    toolbar: {
                        items: [
                            'undo', 'redo',
                            '|',
                            'heading',
                            '|',
                            'bold', 'italic', 'underline', 'strikethrough',
                            '|',
                            'alignment',
                            '|',
                            'bulletedList', 'numberedList',
                            '|',
                            'outdent', 'indent',
                            '|',
                            'blockQuote',
                        ],
                    },
                    placeholder: placeholder || 'Start editing your report...',
                    heading: {
                        options: [
                            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
                        ],
                    },
                }}
                onChange={(event, editor) => {
                    const data = editor.getData();
                    onChange(data);
                }}
            />
        </div>
    );
}
