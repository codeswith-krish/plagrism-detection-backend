import sys
import json
import traceback

def compare_texts(new_project_text, existing_projects):
    """
    Computes TF-IDF vectors and Cosine Similarity between a new project's text
    and an array of existing projects' texts.
    
    Args:
        new_project_text (str): The extracted text of the newly uploaded project.
        existing_projects (list): List of dicts, each containing 'id' and 'text'.
    
    Returns:
        dict: containing highest_similarity percentage and matched_project_id.
    """
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
    except ImportError:
        # Fallback error if scikit-learn is missing in the production environment
        return {"error": "scikit-learn not installed in Python environment"}

    # If the database is empty or new project has no text, return 0 similarity safely
    if not existing_projects or len(existing_projects) == 0 or not new_project_text.strip():
        return {
            "highestSimilarityPercentage": 0,
            "matchedProjectId": None
        }

    # Prepare corpus for vectorization: New project is index 0
    corpus = [new_project_text]
    project_ids = []

    for proj in existing_projects:
        # Handle cases where project text might be null/empty
        text = proj.get("text", "")
        if text.strip():
            corpus.append(text)
            project_ids.append(proj.get("id"))
            
    # If no valid existing text was appended, it's a 0 similarity situation
    if len(corpus) == 1:
        return {
            "highestSimilarityPercentage": 0,
            "matchedProjectId": None
        }

    try:
        # Initialize TF-IDF Vectorizer
        # We use stop_words='english' to remove common unhelpful words for better accuracy
        vectorizer = TfidfVectorizer(stop_words='english')
        
        # Fit and transform the entire corpus
        tfidf_matrix = vectorizer.fit_transform(corpus)
        
        # Calculate cosine similarity between the new project (index 0) 
        # and all other existing projects (index 1 to end)
        similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        
        # Find the highest similarity score and its index
        max_index = similarities.argmax()
        max_score = similarities[max_index]
        
        # Get the corresponding project ID that matched
        matched_id = project_ids[max_index]
        
        # Convert to percentage and round cleanly
        highest_similarity = round(float(max_score * 100), 2)
        
        return {
            "highestSimilarityPercentage": highest_similarity,
            "matchedProjectId": matched_id
        }

    except Exception as e:
        # Return error cleanly to Node.js without crashing the backend thread
        return {
            "error": f"Calculation failed: {str(e)}",
            "highestSimilarityPercentage": 0,
            "matchedProjectId": None
        }

def main():
    # Attempt to read from standard input sent by Node.js child_process
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input received"}))
            return
            
        data = json.loads(input_data)
        
        new_text = data.get("newProjectText", "")
        existing_array = data.get("existingProjectsTextArray", [])
        
        # Run comparison calculations
        result = compare_texts(new_text, existing_array)
        
        # Output the result strictly as valid JSON for Node.js to parse
        print(json.dumps(result))

    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input"}))
    except Exception as e:
        print(json.dumps({"error": f"Python Script Error: {str(e)}\n{traceback.format_exc()}"}))

if __name__ == "__main__":
    main()
