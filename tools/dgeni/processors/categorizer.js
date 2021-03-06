/**
 * Processor to add properties to docs objects.
 *
 * isMethod     | Whether the doc is for a method on a class.
 * isDirective  | Whether the doc is for a @Component or a @Directive
 * isService    | Whether the doc is for an @Injectable
 * isNgModule   | Whether the doc is for an NgModule
 */
module.exports = function categorizer() {
  return {
    $runBefore: ['docs-processed'],
    $process: function(docs) {
      docs.forEach(doc => {
        // The typescriptPackage groups both methods and parameters into "members".
        // Use the presence of `parameters` as a proxy to determine if this is a method.
        if (doc.classDoc && doc.hasOwnProperty('parameters')) {
          doc.isMethod = true;

          // Mark methods with a `void` return type so we can omit show the return type in the docs.
          doc.showReturns = doc.returnType && doc.returnType != 'void';

          normalizeMethodParameters(doc);

          // Maintain a list of methods on the associated class so we can
          // iterate through them while rendering.
          doc.classDoc.methods ?
              doc.classDoc.methods.push(doc) :
              doc.classDoc.methods = [doc];
        } else if (isDirective(doc)) {
          doc.isDirective = true;
        } else if (isService(doc)) {
          doc.isService = true;
        } else if (isNgModule(doc)) {
          doc.isNgModule = true;
        } else if (doc.docType == 'member') {
          doc.isDirectiveInput = isDirectiveInput(doc);
          doc.isDirectiveOutput = isDirectiveOutput(doc);

          doc.classDoc.properties ?
              doc.classDoc.properties.push(doc) :
              doc.classDoc.properties = [doc];
        }
      });
    }
  };
};


/**
 * The `parameters` property are the parameters extracted from TypeScript and are strings
 * of the form "propertyName: propertyType" (literally what's written in the source).
 *
 * The `params` property is pulled from the `@param` JsDoc tag. We need to merge
 * the information of these to get name + type + description.
 *
 * We will use the `params` property to store the final normalized form since it is already
 * an object.
 */
function normalizeMethodParameters(method) {
  if (method.parameters) {
    method.parameters.forEach(parameter => {
      let [parameterName, parameterType] = parameter.split(':');

      if (!method.params) {
        method.params = [];
      }

      let jsDocParam = method.params.find(p => p.name == parameterName);

      if (!jsDocParam) {
        jsDocParam = {name: parameterName};
        method.params.push(jsDocParam);
      }

      jsDocParam.type = parameterType.trim();
    });
  }
}

function isDirective(doc) {
  return hasClassDecorator(doc, 'Component') || hasClassDecorator(doc, 'Directive');
}

function isService(doc) {
  return hasClassDecorator(doc, 'Injectable')
}

function isNgModule(doc) {
  return hasClassDecorator(doc, 'NgModule');
}

function isDirectiveOutput(doc) {
  return hasMemberDecorator(doc, 'Output');
}

function isDirectiveInput(doc) {
  return hasMemberDecorator(doc, 'Input');
}

function hasMemberDecorator(doc, decoratorName) {
  return doc.docType == 'member' && hasDecorator(doc, decoratorName);
}

function hasClassDecorator(doc, decoratorName) {
  return doc.docType == 'class' && hasDecorator(doc, decoratorName);
}

function hasDecorator(doc, decoratorName) {
  return doc.decorators &&
      doc.decorators.length &&
      doc.decorators.some(d => d.name == decoratorName);
}
