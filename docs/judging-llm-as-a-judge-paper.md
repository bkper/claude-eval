# Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena

**Authors:** Lianmin Zheng¹*, Wei-Lin Chiang¹*, Ying Sheng⁴*, Siyuan Zhuang¹, Zhanghao Wu¹, Yonghao Zhuang³, Zi Lin², Zhuohan Li¹, Dacheng Li¹³, Eric P. Xing³⁵, Hao Zhang¹², Joseph E. Gonzalez¹, Ion Stoica¹

¹ UC Berkeley  
² UC San Diego  
³ Carnegie Mellon University  
⁴ Stanford  
⁵ MBZUAI

*Joint first authors. This paper is an extended version of our earlier blog post.

**Conference:** 37th Conference on Neural Information Processing Systems (NeurIPS 2023) Track on Datasets and Benchmarks.

**arXiv:** 2306.05685v4 [cs.CL] 24 Dec 2023

## Abstract

Evaluating large language model (LLM) based chat assistants is challenging due to their broad capabilities and the inadequacy of existing benchmarks in measuring human preferences. To address this, we explore using strong LLMs as judges to evaluate these models on more open-ended questions. We examine the usage and limitations of LLM-as-a-judge, including position, verbosity, and self-enhancement biases, as well as limited reasoning ability, and propose solutions to mitigate some of them. We then verify the agreement between LLM judges and human preferences by introducing two benchmarks: MT-bench, a multi-turn question set; and Chatbot Arena, a crowdsourced battle platform. Our results reveal that strong LLM judges like GPT-4 can match both controlled and crowdsourced human preferences well, achieving over 80% agreement, the same level of agreement between humans. Hence, LLM-as-a-judge is a scalable and explainable way to approximate human preferences, which are otherwise very expensive to obtain. Additionally, we show our benchmark and traditional benchmarks complement each other by evaluating several variants of LLaMA and Vicuna. The MT-bench questions, 3K expert votes, and 30K conversations with human preferences are publicly available at https://github.com/lm-sys/FastChat/tree/main/fastchat/llm_judge.

## 1. Introduction

There has been a proliferation of LLM-based chat assistants (chatbots) that leverage supervised instruction fine-tuning and reinforcement learning with human feedback (RLHF) to unlock new instruction following and conversational abilities. Once aligned with humans, these chat models are strongly preferred by human users over the original, unaligned models on which they are built. However, the heightened user preference does not always correspond to improved scores on traditional LLM benchmarks – benchmarks like MMLU and HELM cannot effectively tell the difference between these aligned models and the base models. This phenomenon suggests that there is a fundamental discrepancy between user perceptions of the usefulness of chatbots and the criteria adopted by conventional benchmarks.

We argue that this discrepancy primarily arises due to existing evaluation that only measures LLMs' core capability on a confined set of tasks (e.g., multi-choice knowledge or retrieval questions), without adequately assessing its alignment with human preference in open-ended tasks, such as the ability to accurately adhere to instructions in multi-turn dialogues.

### Example Multi-turn Dialogue

**Question:** If the FED buys bonds in the secondary market
(A) the money supply will increase. (B) the money supply will decrease. (C) the money supply will not be affected. (D) the discount rate would be affected. Output the answer only.

**Assistant B (Vicuna-13B):**
(A) the money supply will increase.

**Assistant A (LLaMA-13B):**
The Federal Reserve buys bonds in the secondary market to increase the money supply.

**Follow-up Question:** How does it affect my daily life? Give 3 examples.

**Assistant B:**
When the Federal Reserve buys bonds in the secondary market, it can have several effects on the economy that can impact your daily life. Here are three examples:

1. Interest rates: The Federal Reserve's actions in the bond market can influence interest rates, which in turn can affect the cost of borrowing money. For example, if the Federal Reserve buys bonds and drives up demand for them, interest rates on things like mortgages, car loans, and credit cards may go up, making it more expensive to borrow money.

2. Inflation: When the money supply increases, it can lead to inflation, which is the general rise in prices of goods and services. This can impact your daily life by making it more expensive to buy things like groceries, gas, and other necessities.

3. Employment: The Federal Reserve's actions in the bond market can also have an impact on employment. For example, if the Federal Reserve's actions lead to economic growth and increased demand for goods and services, it can create more job opportunities and boost employment.

**Assistant A:**
The Federal Reserve buys bonds in the secondary market to increase the money supply. This affects your daily life by:
1. Increasing the money supply.
2. Increasing the money supply and lowering the discount rate.
3. Increasing the money supply and lowering the discount rate and increasing the money supply.

**GPT-4 Judgment:**
Assistant A provided an incorrect response to the user's question about how the Federal Reserve buying bonds in the secondary market affects daily life. The answer given is repetitive and lacks clear examples of how the action impacts daily life.

On the other hand, Assistant B provided a relevant and accurate response to the user's question about the Federal Reserve buying bonds. The answer includes three clear examples of how the action impacts daily life, such as interest rates, inflation, and employment.

Assistant A should improve by providing relevant, clear, and accurate examples to address the user's question. Assistant B's response is more helpful, relevant, and detailed.

Despite the base LLaMA models showing competitive performance on conventional benchmarks, its answers to open-ended questions are often not preferred by humans. This misalignment of conventional benchmarks underscores the core problem driving this paper: the need for a robust and scalable automated method to evaluate LLM alignment with human preferences.

## 2. MT-Bench and Chatbot Arena

### 2.1 Motivation

With the recent advances of LLMs, LLM-based assistants start to exhibit artificial general intelligence across diverse tasks, from writing and chatting to coding. However, evaluating their broad capabilities also becomes more challenging. Despite the availability of numerous benchmarks for language models, they primarily focus on evaluating models on closed-ended questions with short responses. Given that these chat assistants can now precisely follow user instructions in multi-turn dialogues and answer open-ended questions in a zero-shot manner, current benchmarks are inadequate for assessing such capabilities.

Existing benchmarks mostly fall into the following three categories:

- **Core-knowledge benchmarks**, including MMLU, HellaSwag, ARC, WinoGrande, HumanEval, GSM-8K, and AGIEval, evaluate the core capabilities of pre-trained LLMs using zero-shot and few-shot benchmark sets.

- **Instruction-following benchmarks**, such as Flan, Self-instruct, NaturalInstructions, Super-NaturalInstructions, expand to slightly more open-ended questions and more diverse tasks and are used to evaluate LLMs after instruction fine-tuning.

- **Conversational benchmarks**, like CoQA, MMDialog and OpenAssistant, are closest to our intended use cases. However, the diversity and complexity of their questions often fall short in challenging the capabilities of the latest chatbots.

While largely overlooked by existing LLM benchmarks, human preferences serve as a direct measure of a chatbot's utility in open-ended, multi-turn human-AI interactions.

### 2.2 MT-Bench

We create MT-bench, a benchmark consisting of 80 high-quality multi-turn questions. MT-bench is designed to test multi-turn conversation and instruction-following ability, covering common use cases and focusing on challenging questions to differentiate models. We identify 8 common categories of user prompts to guide its construction: writing, roleplay, extraction, reasoning, math, coding, knowledge I (STEM), and knowledge II (humanities/social science). For each category, we then manually designed 10 multi-turn questions.

#### Sample Multi-turn Questions in MT-bench

| Category | Sample Questions |
|----------|------------------|
| **Writing** | 1st Turn: Compose an engaging travel blog post about a recent trip to Hawaii, highlighting cultural experiences and must-see attractions.<br>2nd Turn: Rewrite your previous response. Start every sentence with the letter A. |
| **Math** | 1st Turn: Given that f(x) = 4x³ − 9x − 14, find the value of f(2).<br>2nd Turn: Find x such that f(x) = 0. |
| **Knowledge** | 1st Turn: Provide insights into the correlation between economic indicators such as GDP, inflation, and unemployment rates. Explain how fiscal and monetary policies...<br>2nd Turn: Now, explain them again like I'm five. |

### 2.3 Chatbot Arena

Our second approach is Chatbot Arena, a crowdsourcing benchmark platform featuring anonymous battles. On this platform, users can interact with two anonymous models simultaneously, posing the same question to both. They vote for which model provides the preferred response, with the identities of the models disclosed post-voting. After running Chatbot Arena for one month, we have collected around 30K votes. Since the platform does not use pre-defined questions, it allows gathering a wide range of unrestricted use cases and votes in the wild, based on the diverse interests of users.

## 3. LLM as a Judge

While our initial evaluations using MT-bench and Chatbot Arena rely on human ratings, collecting human preferences can be costly and laborious. To overcome this, we aim to develop a more scalable and automated approach. Given that most questions in MT-bench and Chatbot Arena are open-ended without reference answers, devising a rule-based program to assess the outputs is extremely challenging. Traditional evaluation metrics based on the similarity between outputs and reference answers (e.g., ROUGE, BLEU) are also ineffective for these questions.

As LLMs continue to improve, they show potential in replacing human annotators in many tasks. Specifically, we are interested in whether LLMs can effectively evaluate the responses of chat assistants and match human preferences.

### 3.1 Types of LLM-as-a-Judge

We propose 3 LLM-as-a-judge variations. They can be implemented independently or in combination:

- **Pairwise comparison**: An LLM judge is presented with a question and two answers, and tasked to determine which one is better or declare a tie.

- **Single answer grading**: Alternatively, an LLM judge is asked to directly assign a score to a single answer.

- **Reference-guided grading**: In certain cases, it may be beneficial to provide a reference solution if applicable.

These methods have different pros and cons. For example, the pairwise comparison may lack scalability when the number of players increases, given that the number of possible pairs grows quadratically; single answer grading may be unable to discern subtle differences between specific pairs, and its results may become unstable, as absolute scores are likely to fluctuate more than relative pairwise results if the judge model changes.

### 3.2 Advantages of LLM-as-a-Judge

LLM-as-a-judge offers two key benefits: **scalability** and **explainability**. It reduces the need for human involvement, enabling scalable benchmarks and fast iterations. Additionally, LLM judges provide not only scores but also explanations, making their outputs interpretable.

### 3.3 Limitations of LLM-as-a-Judge

We identify certain biases and limitations of LLM judges. However, we will also present solutions later and show the agreement between LLM judges and humans is high despite these limitations.

#### Position Bias

**Position bias** is when an LLM exhibits a propensity to favor certain positions over others. This bias is not unique to our context and has been seen in human decision-making and other ML domains.

To analyze the position bias, we construct two similar answers to each first-turn question in MT-bench by calling GPT-3.5 twice with a temperature of 0.7. We then try three LLMs with two different prompts: "default" is our default prompt. "rename" renames the assistants in our default prompt to see whether the bias is on positions or names.

#### Position Bias Results

| Judge | Prompt | Consistency | Biased toward first | Biased toward second | Error |
|-------|--------|-------------|---------------------|---------------------|-------|
| **Claude-v1** | default | 23.8% | 75.0% | 0.0% | 1.2% |
| | rename | 56.2% | 11.2% | 28.7% | 3.8% |
| **GPT-3.5** | default | 46.2% | 50.0% | 1.2% | 2.5% |
| | rename | 51.2% | 38.8% | 6.2% | 3.8% |
| **GPT-4** | default | 65.0% | 30.0% | 5.0% | 0.0% |
| | rename | 66.2% | 28.7% | 5.0% | 0.0% |

We found all of them exhibit strong position bias. Most LLM judges favor the first position. Claude-v1 also shows a name bias which makes it favors "Assistant A". The position bias can be very significant. Only GPT-4 outputs consistent results in more than 60% of cases.

#### Verbosity Bias

**Verbosity bias** is when an LLM judge favors longer, verbose responses, even if they are not as clear, high-quality, or accurate as shorter alternatives.

To examine this bias, we design a "repetitive list" attack with model answers from MT-bench. We first select 23 model answers from MT-bench that contain a numbered list. We then make them unnecessarily verbose by asking GPT-4 to rephrase the list without adding any new information and insert the rephrased new list to the beginning of the original list.

#### Verbosity Bias Results

| Judge | Failure Rate |
|-------|-------------|
| Claude-v1 | 91.3% |
| GPT-3.5 | 91.3% |
| GPT-4 | 8.7% |

This shows that all LLMs may be prone to verbosity bias though GPT-4 defends significantly better than others.

#### Self-Enhancement Bias

We adopt the term "self-enhancement bias" from social cognition literature to describe the effect that LLM judges may favor the answers generated by themselves. We examine this effect statistically. Compared to humans, we do observe that some judges favor certain models. For example, GPT-4 favors itself with a 10% higher win rate; Claude-v1 favors itself with a 25% higher win rate. However, they also favor other models and GPT-3.5 does not favor itself.

#### Limited Capability in Grading Math and Reasoning Questions

LLMs are known to have limited math and reasoning capability, which results in its failure of grading such questions because they do not know the correct answers. However, what is more intriguing is that it also shows limitations in grading basic math problems which it is capable of solving. It's worth noting that although GPT-4 can solve the problem (when asked separately), it was misled by the provided answers, ultimately resulting in incorrect judgment.

### 3.4 Addressing Limitations

We present a few methods to address position bias and the limited grading ability for math questions.

#### Swapping Positions

The position bias can be addressed by simple solutions. A conservative approach is to call a judge twice by swapping the order of two answers and only declare a win when an answer is preferred in both orders. If the results are inconsistent after swapping, we can call it a tie. Another more aggressive approach is to assign positions randomly, which can be effective at a large scale with the correct expectations.

#### Few-shot Judge

We assess whether few-shot examples can improve consistency in the position bias benchmark. We select three good judgment examples using MT-bench-like questions, GPT-3.5 and Vicuna for generating answers, and GPT-4 for generating judgments. The examples cover three cases: A is better, B is better, and tie. The few-shot judge can significantly increase the consistency of GPT-4 from 65.0% to 77.5%. However, high consistency may not imply high accuracy and we are not sure whether the few-shot examples will introduce new biases.

#### Chain-of-Thought and Reference-Guided Judge

We propose two simple methods to mitigate the limited capability in grading math and reasoning questions: chain-of-thought judge and reference-guided judge. Chain-of-thought is a widely used technique to improve LLM's reasoning capability. We propose a similar technique to prompt an LLM judge to begin with answering the question independently and then start grading.

However, even with the CoT prompt, we find that in many cases LLM makes exactly the same mistake as the given answers in its problem-solving process, suggesting that LLM judge may still be misled by the context.

Hence, we propose a reference-guided method, in which we first generate LLM judge's answer independently, and then display it as a reference answer in the judge prompt. We see a significant improvement in failure rate (from 70% to 15%) over the default prompt.

#### Math Question Grading Results

| Method | Failure Rate |
|--------|-------------|
| Default | 14/20 (70%) |
| Chain-of-Thought | 6/20 (30%) |
| Reference | 3/20 (15%) |

### 3.5 Multi-turn Judge

In MT-bench, every question involves two turns to evaluate conversational abilities. Therefore, when comparing two assistants, it becomes necessary to present a total of two questions and four responses, complicating the prompt design. We explore two possible designs: (1) breaking the two turns into two prompts or (2) displaying complete conversations in a single prompt. Our finding is the former one can cause the LLM judge struggling to locate the assistant's previous response precisely. This suggests the necessity of displaying a complete conversation to enable the LLM judge to better grasp the context.

## 4. Agreement Evaluation

We study the agreement between different LLM judges and humans on MT-bench and Chatbot Arena datasets. On MT-bench, we also study the agreement among humans. MT-bench represents a small-scale study with controlled human evaluation, while Chatbot Arena represents a larger-scale study with crowdsourced human evaluation in the wild.

### 4.1 Setup

**MT-bench:** We generate answers for all 80 questions with 6 models: GPT-4, GPT-3.5, Claude-V1, Vicuna-13B, Alpaca-13B, and LLaMA-13B. We then use 2 kinds of judges: LLM judges and 58 expert-level human labelers. The labelers are mostly graduate students so they are considered experts and more skilled than average crowd workers. We let LLM judges evaluate all pairs and let each human evaluate at least 20 random multi-turn questions. This resulted in around 3K votes for all questions.

**Chatbot Arena:** We randomly sample 3K single-turn votes from 30K arena data, which covers models including GPT-4, GPT-3.5, Claude, Vicuna-7B/13B, Koala-13B, Alpaca-13B, LLaMA-13B, and Dolly-12B. We use two kinds of judges: LLM judges and collected crowd judges (2114 unique IPs).

**Metrics:** We define the agreement between two types of judges as the probability of randomly selected individuals (but not identical) of each type agreeing on a randomly selected question. Average win rate is the average of win rates against all other players. These metrics can be computed with or without including tie votes.

### 4.2 High Agreement Between GPT-4 and Humans

We compute agreement on MT-bench data. GPT-4 with both pairwise comparison and single answer grading show very high agreements with human experts. The agreement under setup S2 (w/o tie) between GPT-4 and humans reaches 85%, which is even higher than the agreement among humans (81%). This means GPT-4's judgments closely align with the majority of humans.

#### Agreement Results on MT-bench

**First Turn:**

| Setup | S1 (R = 33%) | S2 (R = 50%) |
|-------|--------------|--------------|
| **Judge** | **G4-Single** | **Human** | **G4-Single** | **Human** |
| **G4-Pair** | 70% (1138) | 66% (1343) | 97% (662) | 85% (859) |
| **G4-Single** | - | 60% (1280) | - | 85% (739) |
| **Human** | - | 63% (721) | - | 81% (479) |

**Second Turn:**

| Setup | S1 (R = 33%) | S2 (R = 50%) |
|-------|--------------|--------------|
| **Judge** | **G4-Single** | **Human** | **G4-Single** | **Human** |
| **G4-Pair** | 70% (1161) | 66% (1325) | 95% (727) | 85% (864) |
| **G4-Single** | - | 59% (1285) | - | 84% (776) |
| **Human** | - | 67% (707) | - | 82% (474) |

We also show that GPT-4's judgments may help humans make better judgments. During our data collection, when a human's choice deviated from GPT-4, we presented GPT-4's judgments to humans and ask if they are reasonable. Despite different views, humans deemed GPT-4's judgments reasonable in 75% of cases and are even willing to change their choices in 34% of cases.

The data from Arena shows a similar trend. Comparing GPT-4 and other LLM judges, we find they reach a similar non-tie agreement ratio between humans but the number of non-tied votes from GPT-4 is much larger. This means that GPT-4 is more affirmative and less suffered from position bias but other models also perform well when they give an affirmative answer.

#### Agreement Results on Chatbot Arena

| Setup | S1 (Random = 33%) | S2 (Random = 50%) |
|-------|-------------------|-------------------|
| **Judge** | **G4-S** | **G3.5** | **C** | **H** | **G4-S** | **G3.5** | **C** | **H** |
| **G4** | 72% (2968) | 66% (3061) | 66% (3062) | 64% (3066) | 95% (1967) | 94% (1788) | 95% (1712) | 87% (1944) |
| **G4-S** | - | 60% (2964) | 62% (2964) | 60% (2968) | - | 89% (1593) | 91% (1538) | 85% (1761) |
| **G3.5** | - | - | 68% (3057) | 54% (3061) | - | - | 96% (1497) | 83% (1567) |
| **C** | - | - | - | 53% (3062) | - | - | - | 84% (1475) |

In both tables, GPT-4 with single-answer grading matches both pairwise GPT-4 and human preferences very well. This means GPT-4 has a relatively stable internal rubric. Although it may sometimes perform slightly worse than pairwise comparison and give more tie votes, it is a more scalable method.

We then perform a breakdown analysis by computing agreement on different model pairs and categories. We only include non-tied votes. We observe the agreement between GPT-4 and human progressively increases in line with the performance disparity of the model pairs (i.e., larger win rate difference), from 70% to nearly 100%. This suggests that GPT-4 aligns with humans better when significant performance differences exist between the models.

### 4.3 Win Rates Under Different Judges

We plot the average win rate of models under different judges on MT-bench and Chatbot Arena. The win rate curves from LLM judges closely match the curves from humans. On MT-bench second turn, proprietary models like Claude and GPT-3.5 are more preferred by the humans compared to the first turn, meaning that a multi-turn benchmark can better differentiate some advanced abilities of models.

#### Category-wise Win Rate of Models

| Model | Writing | Roleplay | Reasoning | Math | Coding | Extraction | STEM | Humanities |
|-------|---------|----------|-----------|------|---------|------------|------|------------|
| **GPT-4** | 61.2% | 67.9% | 49.3% | 66.1% | 56.3% | 66.2% | 76.6% | 72.2% |
| **GPT-3.5** | 50.9% | 60.6% | 32.6% | 63.8% | 55.0% | 48.8% | 52.8% | 53.8% |
| **Vicuna-13B** | 39.7% | 39.2% | 20.1% | 18.0% | 36.9% | 29.2% | 47.0% | 47.5% |
| **LLaMA-13B** | 15.1% | 15.1% | 7.8% | 7.5% | 2.1% | 9.3% | 6.8% | 10.1% |

## 5. Human Preference Benchmark and Standardized Benchmark

Human preference benchmarks such as MT-bench and Chatbot Arena serve as valuable additions to the current standardized LLM benchmarks. They focus on different aspects of a model and the recommended way is to comprehensively evaluate models with both kinds of benchmarks.

We evaluate several model variants derived from LLaMA on MMLU, Truthful QA (MC1), and MT-bench (GPT-4 judge). Since we have shown that GPT-4 single-answer grading also performs well, we use GPT-4 single-answer grading for MT-bench in favor of its scalability and simplicity.

### Evaluation Results of Several Model Variants

| Model | #Training Token | MMLU (5-shot) | TruthfulQA (0-shot) | MT-Bench Score (GPT-4) |
|-------|----------------|---------------|---------------------|------------------------|
| **LLaMA-7B** | 1T | 35.2 | 0.22 | 2.74 |
| **LLaMA-13B** | 1T | 47.0 | 0.26 | 2.61 |
| **Alpaca-7B** | 4.4M | 40.1 | 0.26 | 4.54 |
| **Alpaca-13B** | 4.4M | 48.1 | 0.30 | 4.53 |
| **Vicuna-7B (selected)** | 4.8M | 37.3 | 0.32 | 5.95 |
| **Vicuna-7B (single)** | 184M | 44.1 | 0.30 | 6.04 |
| **Vicuna-7B (all)** | 370M | 47.1 | 0.32 | 6.00 |
| **Vicuna-13B (all)** | 370M | 52.1 | 0.35 | 6.39 |
| **GPT-3.5** | - | 70.0 | - | 7.94 |
| **GPT-4** | - | 86.4 | - | 8.99 |

We find that fine-tuning on high-quality dialog datasets (i.e., ShareGPT) can consistently improve the model performance on MMLU and the improvement scales with fine-tuning data size. On the other hand, a small high-quality conversation dataset can quickly teach the model a style preferred by GPT-4 (or approximately human) but cannot improve MMLU significantly, as shown by the Vicuna-7B (selected) which is trained with only 4.8M tokens or 3K conversations.

No single benchmark can determine model quality, meaning that a comprehensive evaluation is needed. Our results indicate that using LLM-as-a-judge to approximate human preferences is highly feasible and could become a new standard in future benchmarks.

## 6. Discussion

### Limitations

This paper emphasizes helpfulness but largely neglects safety. Honesty and harmlessness are crucial for a chat assistant as well. We anticipate similar methods can be used to evaluate these metrics by modifying the default prompt. Additionally, within helpfulness, there are multiple dimensions like accuracy, relevance, and creativity, but they are all combined into a single metric in this study. A more comprehensive evaluation can be developed by analyzing and separating these dimensions. We propose preliminary solutions to address the limitations and biases of LLM-as-a-judge, but we anticipate more advanced methods can be developed.

### Societal Impacts

The societal impact of this study is multi-faceted. Our evaluation methods can help enhance chatbot quality and user experiences. However, addressing biases in these methods is crucial. Our dataset enables better studies of human preferences and model behavior. Advanced chat assistants may replace certain human tasks, resulting in job displacements and new opportunities.

### Future Directions

1) Benchmarking chatbots at scale with a broader set of categories
2) Open-source LLM judge aligned with human preference  
3) Enhancing open models' math/reasoning capability

## 7. Conclusion

In this paper, we propose LLM-as-a-judge for chatbot evaluation and systematically examine its efficacy using human preference data from 58 experts on MT-bench, as well as thousands of crowd-users on Chatbot Arena. Our results reveal that strong LLMs can achieve an agreement rate of over 80%, on par with the level of agreement among human experts, establishing a foundation for an LLM-based evaluation framework.

## Appendix

### A. Prompt Templates

#### Default Prompt for Pairwise Comparison

```
[System]
Please act as an impartial judge and evaluate the quality of the responses provided by two 
AI assistants to the user question displayed below. You should choose the assistant that 
follows the user's instructions and answers the user's question better. Your evaluation 
should consider factors such as the helpfulness, relevance, accuracy, depth, creativity, 
and level of detail of their responses. Begin your evaluation by comparing the two 
responses and provide a short explanation. Avoid any position biases and ensure that the 
order in which the responses were presented does not influence your decision. Do not allow 
the length of the responses to influence your evaluation. Do not favor certain names of 
the assistants. Be as objective as possible. After providing your explanation, output your 
final verdict by strictly following this format: "[[A]]" if assistant A is better, "[[B]]" 
if assistant B is better, and "[[C]]" for a tie.

[User Question]
{question}

[The Start of Assistant A's Answer]
{answer_a}
[The End of Assistant A's Answer]

[The Start of Assistant B's Answer]
{answer_b}
[The End of Assistant B's Answer]
```

#### Default Prompt for Single Answer Grading

```
[System]
Please act as an impartial judge and evaluate the quality of the response provided by an 
AI assistant to the user question displayed below. Your evaluation should consider factors 
such as the helpfulness, relevance, accuracy, depth, creativity, and level of detail of 
the response. Begin your evaluation by providing a short explanation. Be as objective as 
possible. After providing your explanation, please rate the response on a scale of 1 to 10 
by strictly following this format: "[[rating]]", for example: "Rating: [[5]]".

[Question]
{question}

[The Start of Assistant's Answer]
{answer}
[The End of Assistant's Answer]
```

#### Chain-of-Thought Prompt for Math and Reasoning Questions

```
[System]
Please act as an impartial judge and evaluate the quality of the responses provided by two 
AI assistants to the user question displayed below. Your evaluation should consider 
correctness and helpfulness. You will be given assistant A's answer, and assistant B's 
answer. Your job is to evaluate which assistant's answer is better. You should 
independently solve the user question step-by-step first. Then compare both assistants' 
answers with your answer. Identify and correct any mistakes. Avoid any position biases and 
ensure that the order in which the responses were presented does not influence your 
decision. Do not allow the length of the responses to influence your evaluation. Do not
favor certain names of the assistants. Be as objective as possible. After providing your 
explanation, output your final verdict by strictly following this format: "[[A]]" if 
assistant A is better, "[[B]]" if assistant B is better, and "[[C]]" for a tie.

[User Question]
{question}

[The Start of Assistant A's Answer]
{answer_a}
[The End of Assistant A's Answer]

[The Start of Assistant B's Answer]
{answer_b}
[The End of Assistant B's Answer]
```

#### Reference-Guided Pairwise Comparison

```
[System]
Please act as an impartial judge and evaluate the quality of the responses provided by two 
AI assistants to the user question displayed below. Your evaluation should consider 
correctness and helpfulness. You will be given a reference answer, assistant A's answer, 
and assistant B's answer. Your job is to evaluate which assistant's answer is better. 
Begin your evaluation by comparing both assistants' answers with the reference answer. 
Identify and correct any mistakes. Avoid any position biases and ensure that the order in 
which the responses were presented does not influence your decision. Do not allow the 
length of the responses to influence your evaluation. Do not favor certain names of the 
assistants. Be as objective as possible. After providing your explanation, output your 
final verdict by strictly following this format: "[[A]]" if assistant A is better, "[[B]]" 
if assistant B is better, and "[[C]]" for a tie.

[User Question]
{question}

[The Start of Reference Answer]
{answer_ref}
[The End of Reference Answer]

[The Start of Assistant A's Answer]
{answer_a}
[The End of Assistant A's Answer]

[The Start of Assistant B's Answer]
{answer_b}
[The End of Assistant B's Answer]
```

#### Multi-turn Pairwise Comparison

```
[System]
Please act as an impartial judge and evaluate the quality of the responses provided by two 
AI assistants to the user question displayed below. You should choose the assistant that 
follows the user's instructions and answers the user's question better. Your evaluation 
should consider factors such as the helpfulness, relevance, accuracy, depth, creativity, 
and level of detail of their responses. Begin your evaluation by comparing the two 
responses and provide a short explanation. Avoid any position biases and ensure that the 
order in which the responses were presented does not influence your decision. Do not allow 
the length of the responses to influence your evaluation. Do not favor certain names of 
the assistants. Be as objective as possible. After providing your explanation, output your 
final verdict by strictly following this format: "[[A]]" if assistant A is better, "[[B]]" 
if assistant B is better, and "[[C]]" for a tie.

<|The Start of Assistant A's Conversation with User|>
### User:
{question 1}
### Assistant A:
{answer 1}
### User:
{question 2}
### Assistant A:
{answer 2}
<|The End of Assistant A's Conversation with User|>

<|The Start of Assistant B's Conversation with User|>
### User:
{question 1}
### Assistant B:
{answer 1}
### User:
{question 2}
### Assistant B:
{answer 2}
<|The End of Assistant B's Conversation with User|>
```

### B. Case Studies

#### Example: Position Bias

**Question:** What are some business etiquette norms when doing business in Japan?

**Assistant A:**
Here are some business etiquette norms to keep in mind when doing business in Japan:

1. Bowing: Bowing is a common greeting in Japan. It is a sign of respect and should be reciprocated.
2. Business cards: Business cards are exchanged at the beginning of a meeting. It is important to receive and give business cards with both hands and to take a moment to read the card before putting it away.
3. Punctuality: Being on time is important in Japan. Arrive a few minutes early to show respect for your colleagues.
4. Dress code: Dress conservatively and professionally. Men should wear dark suits and ties, while women should wear conservative business attire.
5. Language: Learn a few basic Japanese phrases to show respect for the culture. It is also important to speak clearly and avoid using slang or idioms.
6. Gift giving: Gift giving is a common practice in Japan. Bring a small gift, such as a box of chocolates or a small souvenir from your home country.
7. Dining etiquette: When dining with colleagues, wait for the host to begin eating before you start. Use chopsticks correctly and avoid leaving food on your plate.

Remember, showing respect for Japanese culture and customs is key to building strong business relationships in Japan.

**Assistant B:**
When doing business in Japan, it is important to be aware of and respect the country's business etiquette norms. Some of these norms include:

1. Greetings: A handshake and bow is the standard greeting in Japan. It is important to bow deeply and to offer a firm handshake.
2. Business cards: In Japan, business cards are exchanged after the initial greeting. It is important to handle the card with respect and to read it carefully before placing it on the table.
3. Meetings: Meetings in Japan are typically formal and conducted in a hierarchical manner. It is important to address people by their titles and to avoid direct eye contact.
4. Punctuality: Punctuality is highly valued in Japan. It is important to arrive on time for meetings and to be prepared in advance.
5. Gift giving: Gift giving is a common practice in Japan, but it is important to be mindful of the occasion and the relationship. Avoid giving gifts that are considered too personal or extravagant.
6. Dining: Dining is an important part of doing business in Japan. It is important to be aware of the proper table manners and to avoid slurping or making loud noises while eating.
7. Communication: Communication in Japan is typically indirect and reserved. It is important to listen carefully and to avoid confrontational language.

Overall, it is important to be respectful, punctual, and mindful of hierarchy when doing business in Japan.

**GPT-4 Judgment (when A is placed in the first position):**
Both Assistant A and Assistant B provide helpful and relevant information about business etiquette norms in Japan. However, Assistant A's answer is more detailed and organized, covering a wider range of topics such as dress code and language, which are not mentioned in Assistant B's response. Assistant A also provides more specific advice on how to handle certain situations, such as exchanging business cards and dining etiquette. Therefore, Assistant A's answer is more comprehensive and useful for someone looking to understand Japanese business etiquette.

**GPT-4 Judgment (when B is placed in the first position):**
Both Assistant A and Assistant B provide helpful and relevant information about business etiquette norms in Japan. However, Assistant B's answer is more detailed and covers a wider range of topics, such as addressing people by their titles, avoiding direct eye contact, and being mindful of communication styles. Assistant A's answer is more concise but lacks some of the depth found in Assistant B's response. Therefore, Assistant B's answer is better in this case.

This example demonstrates how GPT-4's judgment can flip simply by changing the order of the responses, illustrating position bias.

#### Example: Verbosity Bias Attack

**Question:** What is the central dogma of molecular biology? What processes are involved? Who named this?

**Assistant A:**
The central dogma of molecular biology is the fundamental principle that explains how genetic information flows within a biological system. It states that DNA is transcribed into RNA, which is then translated into proteins. This means that the genetic information stored in DNA is first copied into RNA, which then serves as a template for the synthesis of proteins.

The processes involved in the central dogma are:
1. Transcription rephrased: The act of copying genetic information from DNA to RNA.
2. Translation rephrased: The act of using genetic information in RNA to create proteins.
3. Transcription: The process by which the genetic information in DNA is copied into RNA.
4. Translation: The process by which the genetic information in RNA is used to synthesize proteins.

The term "central dogma" was coined by Francis Crick, one of the co-discoverers of the structure of DNA, in 1958.

**Assistant B:**
The central dogma of molecular biology is the fundamental principle that explains how genetic information flows within a biological system. It states that DNA is transcribed into RNA, which is then translated into proteins. This means that the genetic information stored in DNA is first copied into RNA, which then serves as a template for the synthesis of proteins.

The processes involved in the central dogma are:
1. Transcription: The process by which the genetic information in DNA is copied into RNA.
2. Translation: The process by which the genetic information in RNA is used to synthesize proteins.

The term "central dogma" was coined by Francis Crick, one of the co-discoverers of the structure of DNA, in 1958.

**GPT-3.5 Judgment:**
Assistant A provides a more detailed and accurate response to the user's question. While both assistants correctly state the central dogma of molecular biology and who coined the term, Assistant A provides a more comprehensive explanation of the processes involved in the central dogma, including the rephrased definitions of transcription and translation. Therefore, I choose A as the better assistant.

**Claude-v1 Judgment:**
Both assistants answer the question by defining the central dogma and detailing the two processes involved, transcription and translation. However, assistant A provides a more in-depth and detailed explanation by briefly rephrasing and elaborating on these processes. Assistant A also mentions who coined the term "central dogma", which provides useful context and shows a more comprehensive understanding of the topic. Overall, assistant A gives a fuller and more insightful response, so I have chosen it as the better assistant for this question.

**GPT-4 Judgment:**
Both Assistant A and Assistant B provide accurate and relevant information about the central dogma of molecular biology, the processes involved, and who named it. However, Assistant A's answer contains a minor redundancy by rephrasing transcription and translation twice. Assistant B's answer is more concise and avoids this redundancy. Therefore, Assistant B's answer is better.

This example shows how GPT-3.5 and Claude-v1 fall for the verbosity bias, favoring the longer but redundant answer, while GPT-4 correctly identifies the redundancy.

### C. Data Collection

#### MT-bench Human Evaluation

To invite participants, we obtained their consent by letting them sign an application form. We pay them $20 for judging 20 questions, which corresponds to an hourly rate of around $35. The participants are mostly graduate students from more than ten universities.

#### Chatbot Arena

Users are required to accept the terms of use, which obtain their consent and give us the right to release the conversation data. This is a free website. We do not pay users and any user can use this platform without registration.

#### Data Release

We will clean the Personal Identifiable Information (PII) and tag toxic conversations with OpenAI moderation APIs for our dataset release.

### D. Additional Experimental Results

#### Position Bias on Different Categories

| Category | Consistent | Biased toward first | Biased toward second |
|----------|------------|---------------------|---------------------|
| writing | 42.0% | 46.0% | 12.0% |
| roleplay | 68.0% | 30.0% | 2.0% |
| reasoning | 76.0% | 20.0% | 4.0% |
| math | 86.0% | 4.0% | 10.0% |
| coding | 86.0% | 14.0% | 0.0% |
| extraction | 78.0% | 12.0% | 10.0% |
| stem | 44.0% | 54.0% | 2.0% |
| humanities | 36.0% | 60.0% | 4.0% |

Position bias is more noticeable on open questions like writing and stem/humanity knowledge questions. On math and coding questions, LLM judges are more confident even though their judgments can often be wrong.

#### Position Bias on Different Model Pairs

| Pair | Consistent | Biased toward first | Biased toward second |
|------|------------|---------------------|---------------------|
| GPT-3.5 vs Claude-V1 | 67.5% | 23.8% | 8.8% |
| GPT-3.5 vs Vicuna-13B | 73.8% | 23.8% | 2.5% |
| GPT-3.5 vs LLaMA-13B | 98.8% | 1.2% | 0.0% |

The position bias is more noticeable for models with close performance and can almost disappear when the performance of the two models differs a lot.

### E. Training Details of Vicuna Models

Vicuna is created by fine-tuning a LLaMA base model using user-shared conversations gathered from ShareGPT.com with its public APIs. ShareGPT is a website where users can share their ChatGPT conversations. To ensure data quality, we convert the HTML back to markdown and filter out some inappropriate or low-quality samples, which results in 125K conversations after data cleaning.

We then divide lengthy conversations into smaller segments that fit the model's maximum context length. We construct three training datasets with different scales from this cleaned ShareGPT dataset:

#### Dataset Statistics

| Dataset Name | #Token | #Sequence | Avg. turns of conversation | Avg. response length (token) |
|--------------|--------|-----------|----------------------------|------------------------------|
| Alpaca | 4.4M | 52K | 1.0 | 65 |
| Selected | 4.8M | 3K | 4.0 | 343 |
| Single | 184M | 257K | 1.0 | 473 |
| All | 370M | 257K | 2.9 | 373 |

- **All**: the full dataset
- **Single**: only includes the first turn of each conversation  
- **Selected**: a small high-quality dataset of 3K sequences

All models (Vicuna-7B/13B) are trained with the same hyperparameters: global batch size=128, learning rate=2e-5, epochs=3, sequence length=2048. Except for "Selected", which we train for 5 epochs. The training code is built on top of the Alpaca code but additionally handles multi-turn conversations.

### F. Exploring Vicuna as a Judge

#### Zero-Shot Vicuna

When using as-it-is (zero-shot), Vicuna-13B noticeably suffers from limitations including position bias. Vicuna-13B has a consistency rate from 11.2% to 16.2% across different prompt templates, much lower than all the closed-sourced models. In addition, it has a high error rate (from 22.5% to 78.8%) because of its weaker instruction-following capability.

#### Arena Fine-tuned Vicuna

Due to the incapability of the zero-shot Vicuna-13B model, we further finetune the model with human votes from Chatbot Arena. Specifically, we randomly sample 22K single-turn votes from the arena, covering all models supported by the time of this paper submission. We use 20K votes for training, and 2K for validation.

To address the weak instruction following problem, we formulate the problem as a 3-way sequence classification problem. Thus, the model simply needs to predict which one of the chat-bot outputs is better (or tie), without needing to exactly following the provided answer template.

#### Position Bias Results for Vicuna Judge

| Judge | Prompt | Consistency | Biased toward first | Biased toward second | Error |
|-------|--------|-------------|---------------------|---------------------|-------|
| **Vicuna-13B-Zero-Shot** | default | 15.0% | 53.8% | 8.8% | 22.5% |
| | rename | 16.2% | 12.5% | 40.0% | 31.2% |
| | score | 11.2% | 10.0% | 0.0% | 78.8% |
| **Vicuna-13B-Fine-Tune** | default | 65.0% | 27.5% | 7.5% | 0.0% |

The consistency improves significantly from 16.2% to 65.0%. Due to the classification formulation, every output is recognizable (error rate 0%). The classification accuracy over the test dataset achieves 56.8% when including all three labels, and 85.5% when excluding tie predictions and labels, significantly outperforming random guesses of 33% and 50% respectively, and show positive signals to match GPT-4 (66% and 87% respectively).

In conclusion, a further fine-tuned Vicuna-13B model shows strong potential to be used as a cheap open-sourced replacement for expensive closed-sourced LLMs.

---

**Acknowledgement**

This project is partly supported by gifts from Anyscale, Astronomer, Google, IBM, Intel, Lacework, Microsoft, MBZUAI, Samsung SDS, Uber, and VMware. Lianmin Zheng is supported by a Meta Ph.D. Fellowship. We extend our thanks to Xinyang Geng, Hao Liu, Eric Wallace, Xuecheng Li, Tianyi Zhang, Qirong Ho, and Kevin Lin for their insightful discussions.

**Code and Data Availability**

- GitHub: https://github.com/lm-sys/FastChat/tree/main/fastchat/llm_judge
- Leaderboard: https://huggingface.co/spaces/lmsys/chatbot-arena-leaderboard
- Blog: https://lmsys.org/blog/2023-05-03-arena/