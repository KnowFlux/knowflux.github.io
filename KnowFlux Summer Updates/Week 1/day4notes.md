# Today's Plan
The focus for today is improving the book & poetry features on the homepage - improving centering, image sizes, text, and display for a better, more intentional, and professional user experience. 

# Ideas & Options For Improvement

## Idea 1
On large screens, the images feel tall and large, and the text column doesn't feel as pronounced. The "flex: 1;" split that is currently used doesn't feel balanced. We'll use grid with margin and padding to look more intentional. 

### Implementation Steps
1. Change the .feature flex layout to use grid with two, equal-width columns. **Important:** Control image column width with max-width and margin to center. 
2. Remove min-height from the text. Allow text to determine its own height to avoid awkward spacing. 
3. Use object-fit: contain; on the "img" tag inside .featureImage so it scales without strange cropping. 
4. On mobile, use grid to stack and center everything. **Important:** Change max-width to use "vw" property instead. 

## Idea 2
The underline under the text is currently thin, grey, and is not very visible. Instead, use the existing bold, orange "hr" class. 

### Implementation Steps
1. Edit HTML by replacing each "hr" with the already defined class of "underline". 
2. Ensure underline is already defined properly. 
3. Set "margin 10px auto" to center. 

## Idea 3
The C2A text feels plain. It isn't descriptive, and doesn't guide the reader to what each feature is really about. Replace the text with something better and more exciting. Secondly, let's add a "New" badge to the Pinnacle of Reality feature. 

### Implementation Steps
1. Use "span class = "badge", and style in CSS with border + shadow. 
2. Replace the paragraph text with something more exciting:
    1. Exploded: "Read now - new content every week."
    2. Poetry: "Browse our growing collection of haikus and triplets."
    3. Pinnacle: "The newest saga begins. Dive into a tale of reality and destiny."
