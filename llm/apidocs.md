Mongo_DB_DOCS : https://www.mongodb.com/docs/
Galileo API DOCS: # What Is Galileo?

export const DefinitionCard = ({children}) => {
  return <Card variant="secondary">
    <div style={{
    padding: '0.5rem',
    border: '5px solid var(--primary-light)',
    borderRadius: '0.5rem',
    fontSize: '1.3rem',
    lineHeight: '1.4',
    boxShadow: '0 0 10px 10px var(--primary-light)'
  }}>
        {children}
      </div>

</Card>;
};

Galileo is a cutting-edge evaluation and observability platform designed to empower developers to improve their AI apps. Use our Python or TypeScript SDK to add evals directly into your code. Galileo works with all major LLM providers.

## Get started

Start your journey here with four key learning steps.

<CardGroup cols={2}>
  <Card title="Log your first trace" icon="circle-1" horizontal href="/getting-started/quickstart">
    Create and run your first trace in less than 5 minutes.
  </Card>

  <Card title="Evaluate your traces" icon="circle-2" horizontal href="/getting-started/evaluate-and-improve/evaluate-and-improve">
    Learn how to evaluate metrics and improve your prompts.
  </Card>

  <Card title="Run an experiment" icon="circle-3" horizontal href="/getting-started/experiments">
    Use Experiments to move from spot testing to systematic evaluation
  </Card>

  <Card title="Sample projects" icon="circle-4" horizontal href="/getting-started/sample-projects/sample-projects">
    Best practice sample projects to help you learn
  </Card>
</CardGroup>

## Integrate your app with Galileo

Lean how to integrate Galileo into your applications with our code-ready guides.

<CardGroup cols={2}>
  <Card title="Log your application to Galileo" icon="code" horizontal href="/sdk-api/logging/logging-basics">
    Learn how to log your application to Galileo using our SDKs.
  </Card>

  <Card title="Run experiments in code" icon="flask" horizontal href="/sdk-api/experiments/running-experiments">
    Learn how to log your application to Galileo using our SDKs.
  </Card>

  <Card title="Integrate with popular LLMs and agent frameworks" icon="code" horizontal href="/sdk-api/third-party-integrations/overview">
    Learn about the Galileo integrations with third-party SDKs to automatically log your applications.
  </Card>

  <Card title="Cookbooks" icon="book" horizontal href="/cookbooks/overview">
    Code examples on how to integrate Galileo with popular tools and platforms.
  </Card>
</CardGroup>

## Stay up to date

Be the first to know the latest features.

<CardGroup cols={2}>
  <Card title="Release notes" icon="newspaper" horizontal href="/release-notes">
    Latest information on news features and improvements to the platform.
  </Card>
</CardGroup>


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://v2docs.galileo.ai/llms.txt

Fireworks_API_DOCS: # Build with Fireworks AI

> Fast inference and fine-tuning for open source models

Fireworks AI is the fastest platform for building with open source AI models. Get production-ready inference and fine-tuning with best-in-class speed, cost and quality.

## Get started in minutes

<CardGroup cols="3">
  <Card title="Start fast with Serverless" href="/getting-started/quickstart" icon="bolt">
    Use popular models instantly with pay-per-token pricing. Perfect for quality vibe testing and prototyping.
  </Card>

  <Card title="Deploy models & autoscale on dedicated GPUs" href="/getting-started/ondemand-quickstart" icon="server">
    Deploy with high performance on dedicated GPUs with fast autoscaling and minimal cold starts. Optimize deployments for speed and throughput.
  </Card>

  <Card title="Fine-tune models for best quality" href="/fine-tuning/finetuning-intro" icon="sliders">
    Boost model quality with supervised and reinforcement fine-tuning of models up to 1T+ parameters. Start training in minutes, deploy immediately.
  </Card>
</CardGroup>

<Tip>
  Not sure where to start? First, pick the right model for your use case with our [**model selection guide**](/guides/recommended-models). Then choose [**Serverless**](/getting-started/quickstart) to prototype quickly, move to [**Deployments**](/getting-started/ondemand-quickstart) to optimize and run production workloads, or use [**Fine-tuning**](/fine-tuning/finetuning-intro) to improve quality.

  Need help optimizing deployments, fine-tuning models, or setting up production infrastructure? [Talk to our team](https://fireworks.ai/company/contact-us) - we'll help you get the best performance and reliability.
</Tip>

## What you can build

<CardGroup cols="3">
  <Card title="100+ Supported Models" href="https://fireworks.ai/models" icon="books">
    Text, vision, audio, image, and embeddings
  </Card>

  <Card title="Migrate from OpenAI" href="/tools-sdks/openai-compatibility" icon="arrow-right-arrow-left">
    Drop-in replacement - just change the base URL
  </Card>

  <Card title="Function Calling" href="/guides/function-calling" icon="function">
    Connect models to tools and APIs
  </Card>

  <Card title="Structured Outputs" href="/structured-responses/structured-response-formatting" icon="brackets-curly">
    Reliable JSON responses for agentic workflows
  </Card>

  <Card title="Vision Models" href="/guides/querying-vision-language-models" icon="eye">
    Analyze images and documents
  </Card>

  <Card title="Speech to Text" href="/api-reference/audio-transcriptions" icon="microphone">
    Real-time or batch audio transcription
  </Card>

  <Card title="Embeddings & Reranking" href="/guides/querying-embeddings-models" icon="vector">
    Use embeddings & reranking in search & context retrieval
  </Card>

  <Card title="Batch Inference" href="/guides/batch-inference" icon="vector">
    Run async inference jobs at scale, faster and cheaper
  </Card>
</CardGroup>

## Resources & help

<CardGroup cols="3">
  <Card title="Which model should I use?" href="/guides/recommended-models" icon="compass">
    Find the best model for your use case
  </Card>

  <Card title="Cookbook" href="https://github.com/fw-ai/cookbook" icon="book-open">
    Code examples and tutorials
  </Card>

  <Card title="API Reference" href="/api-reference/introduction" icon="code">
    Complete API documentation
  </Card>

  <Card title="Discord Community" href="https://discord.gg/fireworks-ai" icon="discord">
    Ask questions and get help from developers
  </Card>

  <Card title="Security & Compliance" href="https://trust.fireworks.ai/" icon="shield-check">
    SOC 2, HIPAA, and audit reports
  </Card>

  <Card title="System Status" href="https://status.fireworks.ai/" icon="signal">
    Check service uptime
  </Card>

  <Card title="Talk to Sales" href="https://fireworks.ai/company/contact-us" icon="building">
    Talk to our team
  </Card>
</CardGroup>


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.fireworks.ai/llms.txt