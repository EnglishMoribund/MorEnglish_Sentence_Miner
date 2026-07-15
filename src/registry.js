
// registry.js
export const GRAMMAR_REGISTRY = [

  // --- 1. LEXICAL CATEGORIES (PARTS OF SPEECH) ---

  // Nouns & Substantives
  { id: 'noun', label: 'noun', def: 'a word naming a person, place, thing, or idea', category: 'Lexical Categories' },
  { id: 'noun_common', label: 'common noun', def: 'a non-specific person, place, thing, or idea', category: 'Lexical Categories' },
  { id: 'noun_proper', label: 'proper noun', def: 'a specific, capitalized name of a person, place, or entity', category: 'Lexical Categories' },
  { id: 'noun_mass', label: 'mass noun', def: 'an uncountable noun treated as a continuous substance', category: 'Lexical Categories' },
  { id: 'noun_count', label: 'count noun', def: 'a noun that can be modified by a numeral and occur in plural', category: 'Lexical Categories' },
  { id: 'noun_collective', label: 'collective noun', def: 'a noun that refers to a group of individuals', category: 'Lexical Categories' },
  { id: 'noun_abstract', label: 'abstract noun', def: 'a noun denoting an idea, quality, or state rather than a concrete object', category: 'Lexical Categories' },
  { id: 'gerund', label: 'gerund', def: 'a verb form functioning as a noun', category: 'Lexical Categories' },

  // Verbs (By Valency & Function)
  { id: 'verb', label: 'verb', def: 'a word expressing an action, occurrence, or state', category: 'Lexical Categories' },
  { id: 'verb_intrans', label: 'intransitive verb', def: 'a verb that does not take a direct object', category: 'Lexical Categories' },
  { id: 'verb_trans', label: 'transitive verb', def: 'a verb that requires a direct object', category: 'Lexical Categories' },
  { id: 'verb_ditrans', label: 'ditransitive verb', def: 'a verb that takes both a direct and indirect object', category: 'Lexical Categories' },
  { id: 'verb_copular', label: 'copular verb', def: 'a linking verb that connects the subject to a subject complement', category: 'Lexical Categories' },
  { id: 'verb_aux', label: 'auxiliary verb', def: 'a helping verb that accompanies a lexical verb', category: 'Lexical Categories' },
  { id: 'verb_modal', label: 'modal verb', def: 'an auxiliary verb expressing necessity or possibility', category: 'Lexical Categories' },
  { id: 'verb_phrasal', label: 'phrasal verb', def: 'a verb combined with an adverb or a preposition to yield a new meaning', category: 'Lexical Categories' },

  // Modifiers
  { id: 'adjective', label: 'adjective', def: 'a word that modifies a noun', category: 'Lexical Categories' },
  { id: 'adverb', label: 'adverb', def: 'a word that modifies a verb, adjective, or other adverb', category: 'Lexical Categories' },
  { id: 'adj_attributive', label: 'attributive adjective', def: 'an adjective adjacent to the noun it modifies', category: 'Lexical Categories' },
  { id: 'adj_predicative', label: 'predicative adjective', def: 'an adjective functioning as a subject complement following a copula', category: 'Lexical Categories' },
  { id: 'adv_manner', label: 'adverb of manner', def: 'an adverb describing how an action is performed', category: 'Lexical Categories' },
  { id: 'adv_degree', label: 'adverb of degree', def: 'an adverb specifying the intensity of an adjective or verb', category: 'Lexical Categories' },
  { id: 'adv_time', label: 'adverb of time', def: 'an adverb describing when an action occurred', category: 'Lexical Categories' },
  { id: 'adv_place', label: 'adverb of place', def: 'an adverb describing where an action occurred', category: 'Lexical Categories' },

  // Pronouns
  { id: 'pronoun', label: 'pronoun', def: 'a word standing in for a noun or noun phrase', category: 'Lexical Categories' },
  { id: 'pro_personal', label: 'personal pronoun', def: 'a pronoun associated primarily with a particular grammatical person', category: 'Lexical Categories' },
  { id: 'pro_reflexive', label: 'reflexive pronoun', def: 'a pronoun referring back to the subject of the clause', category: 'Lexical Categories' },
  { id: 'pro_demonstrative', label: 'demonstrative pronoun', def: 'a pronoun pointing to specific entities (e.g., this, that)', category: 'Lexical Categories' },
  { id: 'pro_interrogative', label: 'interrogative pronoun', def: 'a pronoun used to ask a question', category: 'Lexical Categories' },
  { id: 'pro_relative', label: 'relative pronoun', def: 'a pronoun introducing a relative clause', category: 'Lexical Categories' },
  { id: 'pro_indefinite', label: 'indefinite pronoun', def: 'a pronoun not referring to any specific person, thing or amount', category: 'Lexical Categories' },

  // Determiners & Quantifiers
  { id: 'determiner', label: 'determiner', def: 'a word introducing a noun and fixing its reference', category: 'Lexical Categories' },
  { id: 'det_definite', label: 'definite article', def: 'a determiner indicating a specific entity (e.g., the)', category: 'Lexical Categories' },
  { id: 'det_indefinite', label: 'indefinite article', def: 'a determiner indicating a non-specific entity (e.g., a, an)', category: 'Lexical Categories' },
  { id: 'quantifier', label: 'quantifier', def: 'a determiner expressing quantity', category: 'Lexical Categories' },
  { id: 'numeral', label: 'numeral', def: 'a word expressing a number or sequential order', category: 'Lexical Categories' },
  
  // Adpositions & Connectives
  { id: 'conjunction', label: 'conjunction', def: 'a word connecting words, phrases, or clauses', category: 'Lexical Categories' },
  { id: 'preposition', label: 'preposition', def: 'an adposition placed before its complement', category: 'Lexical Categories' },
  { id: 'conj_coordinating', label: 'coordinating conjunction', def: 'a conjunction linking independent syntactical elements', category: 'Lexical Categories' },
  { id: 'conj_subordinating', label: 'subordinating conjunction', def: 'a conjunction introducing a dependent clause', category: 'Lexical Categories' },
  { id: 'conj_correlative', label: 'correlative conjunction', def: 'paired conjunctions working together', category: 'Lexical Categories' },

  // Functional & Minor Classes
  { id: 'interjection', label: 'interjection', def: 'an exclamation expressing emotion', category: 'Lexical Categories' },
  { id: 'particle', label: 'particle', def: 'a function word that does not belong to any of the inflected grammatical word classes', category: 'Lexical Categories' },
  { id: 'particle_negative', label: 'negative particle', def: 'a particle used to express negation (e.g., not)', category: 'Lexical Categories' },
  { id: 'clitic', label: 'clitic', def: 'a morpheme functioning like a word but phonologically dependent on another word', category: 'Lexical Categories' },
  // --- SYNTAX & CLAUSES ---
  { id: 'subject', label: 'subject', def: 'the constituent the clause predicates something about', category: 'Syntax & Clauses' },
  { id: 'predicate', label: 'predicate', def: 'the part of the clause that says something about the subject', category: 'Syntax & Clauses' },
  { id: 'dir_object', label: 'direct object', def: 'the entity acted upon by the subject', category: 'Syntax & Clauses' },
  { id: 'indir_object', label: 'indirect object', def: 'the recipient or beneficiary of the direct object', category: 'Syntax & Clauses' },
  { id: 'subj_complement', label: 'subject complement', def: 'a constituent following a copula that describes the subject', category: 'Syntax & Clauses' },
  { id: 'obj_complement', label: 'object complement', def: 'a constituent that describes or renames the direct object', category: 'Syntax & Clauses' },
  { id: 'appositive', label: 'appositive', def: 'a noun phrase set beside another to rename or explain it', category: 'Syntax & Clauses' },
  { id: 'noun_phrase', label: 'noun phrase', def: 'a phrase headed by a noun', category: 'Syntax & Clauses' },
  { id: 'verb_phrase', label: 'verb phrase', def: 'a phrase headed by a verb, including its objects and modifiers', category: 'Syntax & Clauses' },
  { id: 'adj_phrase', label: 'adjective phrase', def: 'a phrase headed by an adjective', category: 'Syntax & Clauses' },
  { id: 'adv_phrase', label: 'adverbial phrase', def: 'a phrase functioning as an adverb', category: 'Syntax & Clauses' },
  { id: 'prep_phrase', label: 'prepositional phrase', def: 'a modifying phrase consisting of a preposition and its object', category: 'Syntax & Clauses' },
  { id: 'absolute_construction', label: 'absolute construction', def: 'a phrase grammatically detached from the main clause', category: 'Syntax & Clauses' },
  { id: 'clause_independent', label: 'independent clause', def: 'a clause that can stand alone as a sentence', category: 'Syntax & Clauses' },
  { id: 'clause_dependent', label: 'dependent clause', def: 'a clause that cannot stand alone as a sentence', category: 'Syntax & Clauses' },
  { id: 'clause_relative', label: 'relative clause', def: 'a clause modifying a noun, introduced by a relative word', category: 'Syntax & Clauses' },
  { id: 'clause_noun', label: 'noun clause', def: 'a clause functioning as a noun within another clause', category: 'Syntax & Clauses' },
  { id: 'clause_adverbial', label: 'adverbial clause', def: 'a clause functioning as an adverb', category: 'Syntax & Clauses' },
  { id: 'clause_conditional', label: 'conditional clause', def: 'a clause expressing a condition, typically with if or unless', category: 'Syntax & Clauses' },
  { id: 'cleft_sentence', label: 'cleft sentence', def: 'a construction that splits a clause to foreground one element', category: 'Syntax & Clauses' },
  { id: 'expletive_subject', label: 'expletive subject', def: 'a dummy subject with no meaning (e.g., it rains, there is)', category: 'Syntax & Clauses' },
  { id: 'extraposition', label: 'extraposition', def: 'moving a clause to the end and filling its slot with a dummy it', category: 'Syntax & Clauses' },
  { id: 'dislocation', label: 'dislocation', def: 'a constituent moved outside the clause and echoed by a pronoun', category: 'Syntax & Clauses' },
  { id: 'parenthetical', label: 'parenthetical', def: 'an aside inserted into a sentence, set off from its structure', category: 'Syntax & Clauses' },
  { id: 'ellipsis', label: 'ellipsis', def: 'omission of words recoverable from context', category: 'Syntax & Clauses' },

  // --- MORPHOLOGY & WORD FORMATION ---
  { id: 'morph_root', label: 'root', def: 'the irreducible core of a word carrying its main meaning', category: 'Morphology' },
  { id: 'morph_stem', label: 'stem', def: 'the base to which inflectional affixes attach', category: 'Morphology' },
  { id: 'morph_prefix', label: 'prefix', def: 'an affix attached before the stem', category: 'Morphology' },
  { id: 'morph_suffix', label: 'suffix', def: 'an affix attached after the stem', category: 'Morphology' },
  { id: 'morph_infix', label: 'infix', def: 'an affix inserted inside the stem', category: 'Morphology' },
  { id: 'morph_inflection', label: 'inflection', def: 'a form change expressing grammatical features, not new meaning', category: 'Morphology' },
  { id: 'morph_derivation', label: 'derivation', def: 'forming a new word by affixation, often changing word class', category: 'Morphology' },
  { id: 'morph_conversion', label: 'conversion (zero derivation)', def: 'changing word class with no change in form', category: 'Morphology' },
  { id: 'morph_compound', label: 'compound', def: 'a word formed from two or more free stems', category: 'Morphology' },
  { id: 'morph_blend', label: 'blend (portmanteau)', def: 'a word fusing parts of two words', category: 'Morphology' },
  { id: 'morph_reduplication', label: 'reduplication', def: 'repeating all or part of a word for grammatical or expressive effect', category: 'Morphology' },
  { id: 'morph_suppletion', label: 'suppletion', def: 'an inflected form from an unrelated root (e.g., go/went)', category: 'Morphology' },
  { id: 'morph_ablaut', label: 'ablaut', def: 'a grammatical vowel alternation inside the root (e.g., sing/sang)', category: 'Morphology' },
  { id: 'morph_back_formation', label: 'back-formation', def: 'a new word created by removing a supposed affix', category: 'Morphology' },
  { id: 'morph_clipping', label: 'clipping', def: 'a word shortened from a longer form (e.g., exam)', category: 'Morphology' },
  { id: 'morph_acronym', label: 'acronym / initialism', def: 'a word formed from the initial letters of a phrase', category: 'Morphology' },

  // --- TENSE & ASPECT ---
  { id: 'tense_present', label: 'present tense', def: 'locates the situation at the moment of speaking', category: 'Tense & Aspect' },
  { id: 'tense_past', label: 'past tense', def: 'locates the situation before the moment of speaking', category: 'Tense & Aspect' },
  { id: 'tense_future', label: 'future tense', def: 'locates the situation after the moment of speaking', category: 'Tense & Aspect' },
  { id: 'tense_pluperfect', label: 'pluperfect', def: 'a past situation completed before another past reference point', category: 'Tense & Aspect' },
  { id: 'aspect_simple', label: 'simple aspect', def: 'presents the situation as a whole, without internal structure', category: 'Tense & Aspect' },
  { id: 'aspect_perfect', label: 'perfect aspect', def: 'a prior situation with continuing relevance', category: 'Tense & Aspect' },
  { id: 'aspect_progressive', label: 'progressive aspect', def: 'a situation in progress at the reference time', category: 'Tense & Aspect' },
  { id: 'aspect_perfect_progressive', label: 'perfect progressive', def: 'an ongoing situation viewed from a later reference point', category: 'Tense & Aspect' },
  { id: 'aspect_habitual', label: 'habitual aspect', def: 'a situation that recurs characteristically', category: 'Tense & Aspect' },
  { id: 'aspect_iterative', label: 'iterative aspect', def: 'an action repeated on a single occasion', category: 'Tense & Aspect' },
  { id: 'aspect_inchoative', label: 'inchoative aspect', def: 'the beginning of a state or action', category: 'Tense & Aspect' },
  { id: 'aspect_cessative', label: 'cessative aspect', def: 'the ending of a state or action', category: 'Tense & Aspect' },
  { id: 'aspect_prospective', label: 'prospective aspect', def: 'a situation about to occur (e.g., be about to)', category: 'Tense & Aspect' },
  { id: 'aspect_gnomic', label: 'gnomic', def: 'a general truth not tied to any particular time', category: 'Tense & Aspect' },

  // --- MOOD & MODALITY ---
  { id: 'mood_indicative', label: 'indicative mood', def: 'presents the situation as factual', category: 'Mood & Modality' },
  { id: 'mood_subjunctive', label: 'subjunctive mood', def: 'presents the situation as wished, doubted, or hypothetical', category: 'Mood & Modality' },
  { id: 'mood_imperative', label: 'imperative mood', def: 'expresses a command or request', category: 'Mood & Modality' },
  { id: 'mood_conditional', label: 'conditional mood', def: 'a situation dependent on a condition', category: 'Mood & Modality' },
  { id: 'mood_hortative', label: 'hortative mood', def: 'urges or encourages an action (e.g., let\'s)', category: 'Mood & Modality' },
  { id: 'mood_interrogative', label: 'interrogative', def: 'a form marking a question', category: 'Mood & Modality' },
  { id: 'modality_epistemic', label: 'epistemic modality', def: 'the speaker\'s judgement of likelihood or certainty', category: 'Mood & Modality' },
  { id: 'modality_deontic', label: 'deontic modality', def: 'obligation, permission, or prohibition', category: 'Mood & Modality' },
  { id: 'modality_dynamic', label: 'dynamic modality', def: 'ability or willingness of the subject', category: 'Mood & Modality' },

  // --- VOICE & VALENCY ---
  { id: 'voice_active', label: 'active voice', def: 'the subject performs the action', category: 'Voice & Valency' },
  { id: 'voice_passive', label: 'passive voice', def: 'the subject undergoes the action', category: 'Voice & Valency' },
  { id: 'voice_middle', label: 'middle voice', def: 'the subject acts on or for itself', category: 'Voice & Valency' },
  { id: 'voice_reflexive', label: 'reflexive construction', def: 'subject and object are the same referent', category: 'Voice & Valency' },
  { id: 'voice_reciprocal', label: 'reciprocal construction', def: 'participants act on each other', category: 'Voice & Valency' },
  { id: 'valency_causative', label: 'causative construction', def: 'a construction adding a causer to the event', category: 'Voice & Valency' },

  // --- NON-FINITE FORMS ---
  { id: 'nonfin_infinitive', label: 'infinitive', def: 'the unmarked citation form of a verb, often with to', category: 'Non-Finite Forms' },
  { id: 'nonfin_bare_infinitive', label: 'bare infinitive', def: 'an infinitive without to, after modals and some verbs', category: 'Non-Finite Forms' },
  { id: 'nonfin_present_participle', label: 'present participle', def: 'the -ing verb form used adjectivally or progressively', category: 'Non-Finite Forms' },
  { id: 'nonfin_past_participle', label: 'past participle', def: 'the verb form used in perfects and passives', category: 'Non-Finite Forms' },
  { id: 'nonfin_verbal_noun', label: 'verbal noun', def: 'a noun derived from a verb, naming the action', category: 'Non-Finite Forms' },

  // --- AGREEMENT: PERSON, NUMBER, GENDER ---
  { id: 'num_singular', label: 'singular', def: 'grammatical number denoting one', category: 'Agreement' },
  { id: 'num_plural', label: 'plural', def: 'grammatical number denoting more than one', category: 'Agreement' },
  { id: 'pers_first', label: 'first person', def: 'reference including the speaker', category: 'Agreement' },
  { id: 'pers_second', label: 'second person', def: 'reference to the addressee', category: 'Agreement' },
  { id: 'pers_third', label: 'third person', def: 'reference to neither speaker nor addressee', category: 'Agreement' },
  { id: 'gen_masculine', label: 'masculine gender', def: 'a grammatical gender class', category: 'Agreement' },
  { id: 'gen_feminine', label: 'feminine gender', def: 'a grammatical gender class', category: 'Agreement' },
  { id: 'gen_neuter', label: 'neuter gender', def: 'a grammatical gender class', category: 'Agreement' },

  // --- DEGREE & COMPARISON ---
  { id: 'deg_positive', label: 'positive degree', def: 'the plain, uncompared form of an adjective or adverb', category: 'Degree & Comparison' },
  { id: 'deg_comparative', label: 'comparative degree', def: 'a form expressing a higher degree than something else', category: 'Degree & Comparison' },
  { id: 'deg_superlative', label: 'superlative degree', def: 'a form expressing the highest degree in a set', category: 'Degree & Comparison' },
  { id: 'deg_equative', label: 'equative degree', def: 'a form expressing equal degree (as...as)', category: 'Degree & Comparison' },
  { id: 'deg_elative_degree', label: 'elative degree', def: 'a very high degree without explicit comparison', category: 'Degree & Comparison' },

  // --- DEFINITENESS & REFERENCE ---
  { id: 'ref_definite', label: 'definite reference', def: 'reference to an identifiable entity', category: 'Definiteness & Reference' },
  { id: 'ref_indefinite', label: 'indefinite reference', def: 'reference to a non-identified entity', category: 'Definiteness & Reference' },
  { id: 'ref_specific', label: 'specific reference', def: 'reference to a particular entity the speaker has in mind', category: 'Definiteness & Reference' },
  { id: 'ref_generic', label: 'generic reference', def: 'reference to a class as a whole', category: 'Definiteness & Reference' },
  { id: 'ref_anaphora', label: 'anaphora', def: 'reference back to something mentioned earlier', category: 'Definiteness & Reference' },
  { id: 'ref_cataphora', label: 'cataphora', def: 'reference forward to something mentioned later', category: 'Definiteness & Reference' },
  { id: 'ref_deixis', label: 'deixis', def: 'reference anchored to the speech situation (here, now, you)', category: 'Definiteness & Reference' },
  { id: 'ref_antecedent', label: 'antecedent', def: 'the expression a pronoun or pro-form refers back to', category: 'Definiteness & Reference' },

  // --- SEMANTIC ROLES ---
  { id: 'role_agent', label: 'agent', def: 'the deliberate instigator of the event', category: 'Semantic Roles' },
  { id: 'role_patient', label: 'patient', def: 'the participant affected or changed by the event', category: 'Semantic Roles' },
  { id: 'role_theme', label: 'theme', def: 'the participant moved or located, unchanged in state', category: 'Semantic Roles' },
  { id: 'role_experiencer', label: 'experiencer', def: 'the participant who perceives or feels', category: 'Semantic Roles' },
  { id: 'role_stimulus', label: 'stimulus', def: 'what is perceived or provokes the experience', category: 'Semantic Roles' },
  { id: 'role_instrument', label: 'instrument', def: 'the means by which the action is performed', category: 'Semantic Roles' },
  { id: 'role_beneficiary', label: 'beneficiary', def: 'the participant for whose benefit the action occurs', category: 'Semantic Roles' },
  { id: 'role_recipient', label: 'recipient', def: 'the participant who receives something', category: 'Semantic Roles' },
  { id: 'role_goal', label: 'goal', def: 'the endpoint of motion or transfer', category: 'Semantic Roles' },
  { id: 'role_source', label: 'source', def: 'the origin of motion or transfer', category: 'Semantic Roles' },
  { id: 'role_location', label: 'location', def: 'where the event takes place', category: 'Semantic Roles' },

  // --- DISCOURSE & PRAGMATICS ---
  { id: 'disc_topic', label: 'topic', def: 'what the utterance is about', category: 'Discourse & Pragmatics' },
  { id: 'disc_focus', label: 'focus', def: 'the new or emphasized information in the utterance', category: 'Discourse & Pragmatics' },
  { id: 'disc_marker', label: 'discourse marker', def: 'a word managing the flow of discourse (well, anyway)', category: 'Discourse & Pragmatics' },
  { id: 'disc_filler', label: 'filler', def: 'a hesitation sound or word (um, like)', category: 'Discourse & Pragmatics' },
  { id: 'disc_tag_question', label: 'tag question', def: 'a short question appended to a statement (isn\'t it?)', category: 'Discourse & Pragmatics' },
  { id: 'disc_hedge', label: 'hedge', def: 'an expression softening the force of a claim (sort of)', category: 'Discourse & Pragmatics' },
  { id: 'disc_honorific', label: 'honorific', def: 'a form encoding respect or social distance', category: 'Discourse & Pragmatics' },
  { id: 'disc_backchannel', label: 'backchannel', def: 'a listener\'s signal of attention (uh-huh, mm)', category: 'Discourse & Pragmatics' },
  { id: 'disc_performative', label: 'performative', def: 'an utterance that performs the act it names (I promise)', category: 'Discourse & Pragmatics' },
  { id: 'disc_rhetorical_question', label: 'rhetorical question', def: 'a question asked for effect, not information', category: 'Discourse & Pragmatics' },

  // --- PHRASEOLOGY & LEXICON ---
  { id: 'phr_idiom', label: 'idiom', def: 'a fixed expression whose meaning is not compositional', category: 'Phraseology & Lexicon' },
  { id: 'phr_collocation', label: 'collocation', def: 'words that habitually co-occur (heavy rain)', category: 'Phraseology & Lexicon' },
  { id: 'phr_proverb', label: 'proverb', def: 'a traditional saying expressing a general truth', category: 'Phraseology & Lexicon' },
  { id: 'phr_cliche', label: 'cliché', def: 'an overused expression drained of force', category: 'Phraseology & Lexicon' },
  { id: 'phr_euphemism', label: 'euphemism', def: 'a mild expression substituted for a blunt one', category: 'Phraseology & Lexicon' },
  { id: 'phr_loanword', label: 'loanword', def: 'a word borrowed from another language', category: 'Phraseology & Lexicon' },
  { id: 'phr_calque', label: 'calque', def: 'a word-for-word translation of a foreign expression', category: 'Phraseology & Lexicon' },
  { id: 'phr_archaism', label: 'archaism', def: 'an old-fashioned word or construction', category: 'Phraseology & Lexicon' },
  { id: 'phr_neologism', label: 'neologism', def: 'a newly coined word or usage', category: 'Phraseology & Lexicon' },
  { id: 'phr_slang', label: 'slang', def: 'informal vocabulary marking group membership', category: 'Phraseology & Lexicon' },
  { id: 'phr_jargon', label: 'jargon', def: 'specialized vocabulary of a trade or field', category: 'Phraseology & Lexicon' },
  { id: 'phr_onomatopoeia', label: 'onomatopoeia', def: 'a word imitating the sound it names', category: 'Phraseology & Lexicon' },
  { id: 'phr_false_friend', label: 'false friend', def: 'a word resembling one in another language but differing in meaning', category: 'Phraseology & Lexicon' },

  // --- GRAMMATICAL CASES (English) ---
  { id: 'nominative', label: 'nominative (subjective)', def: 'indicating subject of a verb (I, he, who)', category: 'Grammatical Case' },
  { id: 'accusative', label: 'accusative (objective)', def: 'indicating direct object of a verb (me, him, whom)', category: 'Grammatical Case' },
  { id: 'dative', label: 'dative', def: 'indicating indirect object of a verb', category: 'Grammatical Case' },
  { id: 'genitive', label: 'genitive', def: 'indicating possession, origin or relation', category: 'Grammatical Case' },
  { id: 'possessive', label: 'possessive', def: 'indicating possession (\'s, my, whose)', category: 'Grammatical Case' },
  { id: 'vocative', label: 'vocative', def: 'indicating calling or personal address', category: 'Grammatical Case' }
];