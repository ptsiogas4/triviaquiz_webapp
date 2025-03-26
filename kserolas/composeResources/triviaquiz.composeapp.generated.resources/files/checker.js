const fs = require('fs');
const path = require('path');

// Specify the directory containing the JSON files
const directoryPath = './'; // Change this to your actual path

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }

    files.forEach(file => {
        if (path.extname(file) === '.json') {
            const filePath = path.join(directoryPath, file);
            
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error(`Error reading file ${file}:`, err);
                    return;
                }

                try {
                    let jsonData = JSON.parse(data);

                    if (jsonData.questions && Array.isArray(jsonData.questions)) {
                        let seenQuestions = new Set(); // To track duplicate questions

                        jsonData.questions = jsonData.questions.filter(q => {
                            const isValidChoiceCount = q.choices.length >= 2 && q.choices.length <= 4;
                            const isValidCorrectAnswer = q.choices.includes(q.correct_answer);
                            const isDuplicate = seenQuestions.has(q.question);
                            const isQuestionEmpty = q.question.trim().length === 0;

                            if (!isValidChoiceCount) {
                                console.log(`❌ Discarding question (incorrect number of choices: ${q.choices.length}):`, q.question);
                            }
                            if (!isValidCorrectAnswer) {
                                console.log(`❌ Discarding question (correct answer not in choices):`, q.question);
                            }
                            if (isDuplicate) {
                                console.log(`❌ Discarding duplicate question:`, q.question);
                            }

                            if (isQuestionEmpty) {
                                console.log(`❌ Discarding empty question:`, q.question);
                            }

                            if (isValidChoiceCount && isValidCorrectAnswer && !isDuplicate && !isQuestionEmpty) {
                                seenQuestions.add(q.question);
                                return true; // Keep the valid question
                            }
                            return false; // Remove invalid or duplicate questions
                        });
                    }

                    // Write the filtered JSON back to the file
                    fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
                        if (err) {
                            console.error(`Error writing to file ${file}:`, err);
                        } else {
                            console.log(`✅ Processed file: ${file}`);

                            // Revalidate JSON after writing
                            fs.readFile(filePath, 'utf8', (err, newData) => {
                                if (err) {
                                    console.error(`Error reading back file ${file}:`, err);
                                    return;
                                }
                                try {
                                    JSON.parse(newData);
                                    console.log(`✅ ${file} is a valid JSON file. It has: ${jsonData.questions.length} questions.`);
                                } catch (validationError) {
                                    console.error(`❌ ${file} is not a valid JSON file after processing.`);
                                }
                            });
                        }
                    });
                } catch (parseError) {
                    console.error(`Error parsing JSON in file ${file}:`, parseError);
                }
            });
        }
    });
});