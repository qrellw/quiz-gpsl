"""
Parse NGAN_HANG_CAU_HOI_GIAI_THICH_CHI_TIET.md → data.js
Converts the Markdown question bank into a JavaScript data file.
"""
import re
import json

INPUT_FILE = r'd:\GPSL\NGAN_HANG_CAU_HOI_GIAI_THICH_CHI_TIET.md'
OUTPUT_FILE = r'd:\GPSL\quiz-app\js\data.js'

def parse_questions(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    questions = []
    global_id = 0
    chapter_index = -1
    current_chapter = ""
    
    # Split by chapter headers (# TITLE)
    # We use a regex that matches lines starting with # but not ## or ###
    chapter_splits = re.split(r'\n(?=# [^#])', '\n' + content)
    
    for chapter_block in chapter_splits:
        # Extract chapter title
        chapter_match = re.match(r'# (.+)', chapter_block.strip())
        if not chapter_match:
            continue
        
        chapter_title = chapter_match.group(1).strip()
        
        # Skip the main title and subtitle
        if 'NGÂN HÀNG CÂU HỎI' in chapter_title or 'BẢN GIẢI THÍCH' in chapter_title:
            continue
        
        chapter_index += 1
        current_chapter = chapter_title
        
        # Split this chapter into questions
        question_splits = re.split(r'(?=### Câu \d+)', chapter_block)
        
        for q_block in question_splits:
            q_match = re.match(r'### Câu (\d+):\s*(.+)', q_block.strip())
            if not q_match:
                continue
            
            global_id += 1
            local_num = int(q_match.group(1))
            question_text = q_match.group(2).strip()
            
            # Extract options (A. xxx, B. xxx, etc.)
            options = []
            option_pattern = re.findall(r'\n([A-E])\.\s*(.+)', q_block)
            for key, text in option_pattern:
                # Skip if this looks like it's inside the explanation
                options.append({"key": key, "text": text.strip()})
            
            # Remove duplicate options that might appear in explanations
            # Keep only the first occurrence of each key
            seen_keys = set()
            unique_options = []
            for opt in options:
                if opt["key"] not in seen_keys:
                    seen_keys.add(opt["key"])
                    unique_options.append(opt)
            options = unique_options
            
            # Extract answer
            answer_match = re.search(r'\*\*(?:Đáp án đúng|Đáp án|ĐÁP ÁN):\*\*\s*([A-E])', q_block)
            answer = answer_match.group(1) if answer_match else "?"
            
            # Extract explanation
            explanation = ""
            expl_match = re.search(r'\*\*(?:Giải thích chi tiết|Giải thích|GIẢI THÍCH):\*\*\s*\n(.*?)(?=\n---|\Z)', q_block, re.DOTALL)
            if expl_match:
                explanation = expl_match.group(1).strip()
            
            questions.append({
                "id": global_id,
                "localNum": local_num,
                "chapter": current_chapter,
                "chapterIndex": chapter_index,
                "question": question_text,
                "options": options,
                "answer": answer,
                "explanation": explanation
            })
    
    return questions

def write_js(questions, output_path):
    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Build chapter list
    chapters = []
    seen = set()
    for q in questions:
        if q["chapter"] not in seen:
            seen.add(q["chapter"])
            count = sum(1 for qq in questions if qq["chapter"] == q["chapter"])
            chapters.append({
                "index": q["chapterIndex"],
                "title": q["chapter"],
                "count": count
            })
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated from NGAN_HANG_CAU_HOI_GIAI_THICH_CHI_TIET.md\n')
        f.write('// DO NOT EDIT MANUALLY\n\n')
        f.write('const CHAPTERS = ')
        f.write(json.dumps(chapters, ensure_ascii=False, indent=2))
        f.write(';\n\n')
        f.write('const QUESTIONS = ')
        f.write(json.dumps(questions, ensure_ascii=False, indent=2))
        f.write(';\n')
    
    print(f"Generated {output_path}")
    print(f"  Total questions: {len(questions)}")
    print(f"  Total chapters: {len(chapters)}")
    for ch in chapters:
        print(f"    [{ch['index']}] {ch['title'][:50]}: {ch['count']} questions")

if __name__ == '__main__':
    questions = parse_questions(INPUT_FILE)
    write_js(questions, OUTPUT_FILE)
